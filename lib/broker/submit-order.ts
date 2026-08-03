import "server-only";
import { randomUUID } from "crypto";
import { getServiceClient } from "@/lib/api/serviceRole";
import { preflight, type BrokerMode } from "@/lib/broker/preflight";
import {
  resolveAlpacaClient,
  AlpacaHttpError,
  AlpacaTransportError,
  type AlpacaClient,
} from "@/lib/broker/alpaca";

// Order submission state machine.
//
// THE RULE THIS FILE EXISTS TO ENFORCE: we never record a fill price, a
// quantity, or a status that did not come from Alpaca. There is no estimate,
// no optimistic write, no "probably filled". Every field in broker_orders is
// copied from the broker's own response, and the full response is kept in
// `raw` so the derived columns can always be checked against it.
//
// The second rule: an order whose outcome we do not know is NEVER retried. A
// POST that timed out may already be resting at the market -- Alpaca's own
// documentation says so. Retrying is how one intent becomes two positions.
// Such an intent goes to `unknown_needs_reconcile` and blocks further orders
// on that symbol until a human or a reconciler resolves it.

export type IntentState =
  | "intent_created"
  | "preflight_refused"
  | "submitted"
  | "adopted_duplicate"
  | "rejected"
  | "unknown_needs_reconcile"
  | "blocked_unreconciled";

export interface SubmitOrderInput {
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  limitPrice: number;
  mode: BrokerMode;
}

export type SubmitOutcome =
  | { status: 201; body: Record<string, unknown> }
  | { status: 200; body: Record<string, unknown> }
  | { status: 202; body: Record<string, unknown> }
  | { status: 400 | 403 | 409 | 422 | 502 | 503; body: Record<string, unknown> };

/** Copy an Alpaca order into broker_orders. Every column comes from the broker. */
export async function persistBrokerOrder(
  userId: string,
  mode: string,
  order: Record<string, unknown>
): Promise<void> {
  const svc = getServiceClient();
  if (!svc) return;
  await svc.from("broker_orders").upsert(
    {
      user_id: userId,
      mode,
      broker_order_id: String(order.id),
      client_order_id: order.client_order_id == null ? null : String(order.client_order_id),
      symbol: String(order.symbol),
      side: String(order.side),
      qty: order.qty == null ? null : Number(order.qty),
      filled_qty: order.filled_qty == null ? null : Number(order.filled_qty),
      avg_fill_price:
        order.filled_avg_price == null ? null : Number(order.filled_avg_price),
      status: order.status == null ? null : String(order.status),
      submitted_at: (order.submitted_at as string) ?? null,
      filled_at: (order.filled_at as string) ?? null,
      raw: order,
      synced_at: new Date().toISOString(),
    },
    { onConflict: "user_id,mode,broker_order_id" }
  );
}

/** Mirror the broker's positions into broker_positions, verbatim. */
export async function syncBrokerPositions(
  userId: string,
  mode: string,
  client: AlpacaClient
): Promise<Record<string, unknown>[]> {
  const svc = getServiceClient();
  const positions = await client.getPositions();
  if (!svc) return positions;

  const now = new Date().toISOString();
  for (const p of positions) {
    await svc.from("broker_positions").upsert(
      {
        user_id: userId,
        mode,
        symbol: String(p.symbol),
        qty: Number(p.qty),
        avg_entry_price: p.avg_entry_price == null ? null : Number(p.avg_entry_price),
        market_value: p.market_value == null ? null : Number(p.market_value),
        unrealized_pnl: p.unrealized_pl == null ? null : Number(p.unrealized_pl),
        raw: p,
        synced_at: now,
      },
      { onConflict: "user_id,mode,symbol" }
    );
  }
  // A position the broker no longer reports is closed; drop our mirror of it
  // rather than leaving a stale row that looks like a holding.
  const held = positions.map((p) => String(p.symbol));
  const { data: existing } = await svc
    .from("broker_positions")
    .select("symbol")
    .eq("user_id", userId)
    .eq("mode", mode);
  for (const row of existing || []) {
    if (!held.includes(row.symbol)) {
      await svc
        .from("broker_positions")
        .delete()
        .eq("user_id", userId)
        .eq("mode", mode)
        .eq("symbol", row.symbol);
    }
  }
  return positions;
}

async function setIntent(
  clientOrderId: string,
  patch: Record<string, unknown>
): Promise<void> {
  const svc = getServiceClient();
  if (!svc) return;
  await svc
    .from("order_intents")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("client_order_id", clientOrderId);
}

async function audit(userId: string, event: string, detail: Record<string, unknown>) {
  const svc = getServiceClient();
  if (!svc) return;
  try {
    await svc.from("broker_audit_log").insert({ user_id: userId, event, detail });
  } catch {
    /* best-effort */
  }
}

export async function submitOrder(input: SubmitOrderInput): Promise<SubmitOutcome> {
  const svc = getServiceClient();
  if (!svc) {
    return {
      status: 503,
      body: { error: "Broker layer not configured (missing service credentials). Nothing was sent." },
    };
  }

  // The server's own environment decides which venue we can reach. The caller
  // has no say; input.mode is only checked for agreement with it.
  const { client, reason, mode: envMode } = resolveAlpacaClient();
  if (!client) {
    await audit(input.userId, "order_refused", { reason, symbol: input.symbol });
    return { status: 503, body: { error: `${reason} Nothing was sent.` } };
  }
  if (envMode !== input.mode) {
    const msg = `Account is configured for "${input.mode}" but this server is connected to "${envMode}". Refusing to send.`;
    await audit(input.userId, "order_refused", { reason: msg, symbol: input.symbol });
    return { status: 409, body: { error: msg } };
  }

  // An unresolved indeterminate order on this symbol blocks new ones. We do
  // not know what is already resting at the market for it.
  const { data: stuck } = await svc
    .from("order_intents")
    .select("client_order_id, created_at")
    .eq("user_id", input.userId)
    .eq("symbol", input.symbol)
    .eq("state", "unknown_needs_reconcile");
  if (stuck && stuck.length > 0) {
    const msg = `${input.symbol} has ${stuck.length} unreconciled order intent(s) whose outcome is unknown (${stuck
      .map((s) => s.client_order_id)
      .join(", ")}). Refusing to send another until they are resolved.`;
    await audit(input.userId, "order_blocked_unreconciled", { symbol: input.symbol, stuck });
    return { status: 409, body: { error: msg } };
  }

  // (a) WRITE-AHEAD. The intent exists in the database before any packet
  //     leaves this process, so a crash mid-flight still leaves a record that
  //     something may be out there.
  const clientOrderId = randomUUID();
  const { error: intentErr } = await svc.from("order_intents").insert({
    client_order_id: clientOrderId,
    user_id: input.userId,
    mode: input.mode,
    symbol: input.symbol,
    side: input.side,
    qty: input.qty,
    limit_price: input.limitPrice,
    state: "intent_created" satisfies IntentState,
  });
  if (intentErr) {
    return { status: 503, body: { error: `Could not record order intent: ${intentErr.message}. Nothing was sent.` } };
  }

  // (b) The existing gate. A refusal ends here, before any network call.
  const verdict = await preflight({
    userId: input.userId,
    symbol: input.symbol,
    side: input.side,
    qty: input.qty,
    mode: input.mode,
  });
  if (!verdict.allowed) {
    await setIntent(clientOrderId, {
      state: "preflight_refused" satisfies IntentState,
      last_error: verdict.reason,
    });
    return {
      status: 403,
      body: { placed: false, clientOrderId, verdict, message: "Preflight refused. No order was sent." },
    };
  }

  // (c) The only POST in this codebase.
  let order: Record<string, unknown>;
  try {
    order = await client.submitOrder({
      symbol: input.symbol,
      qty: input.qty,
      side: input.side,
      type: "limit",
      time_in_force: "day",
      limit_price: input.limitPrice,
      client_order_id: clientOrderId,
    });
  } catch (e) {
    // (d) Duplicate client_order_id. This is NOT a new order -- the broker
    //     already has one under this id. Adopt what it says; never resubmit.
    if (e instanceof AlpacaHttpError && e.isDuplicateClientOrderId) {
      try {
        const existing = await client.getOrderByClientOrderId(clientOrderId);
        await persistBrokerOrder(input.userId, input.mode, existing);
        await setIntent(clientOrderId, {
          state: "adopted_duplicate" satisfies IntentState,
          broker_order_id: String(existing.id),
          last_error: e.body,
        });
        await audit(input.userId, "order_adopted_duplicate", { clientOrderId, brokerOrderId: existing.id });
        return {
          status: 200,
          body: { placed: true, adopted: true, clientOrderId, order: existing, message: "Duplicate client_order_id: adopted the broker's existing order. Nothing was resubmitted." },
        };
      } catch (lookupErr) {
        await setIntent(clientOrderId, {
          state: "unknown_needs_reconcile" satisfies IntentState,
          last_error: `duplicate id, and lookup failed: ${lookupErr instanceof Error ? lookupErr.message : String(lookupErr)}`,
        });
        return { status: 502, body: { error: "Broker reported a duplicate order id but the lookup failed. Marked for reconciliation; nothing was resubmitted.", clientOrderId } };
      }
    }

    // (e) Indeterminate. The order may already be at the market. Do not retry.
    if (e instanceof AlpacaTransportError) {
      await setIntent(clientOrderId, {
        state: "unknown_needs_reconcile" satisfies IntentState,
        last_error: e.message,
      });
      await audit(input.userId, "order_unknown_needs_reconcile", { clientOrderId, symbol: input.symbol, error: e.message });
      return {
        status: 502,
        body: {
          placed: null,
          clientOrderId,
          error: `The broker did not answer (${e.message}). This order's outcome is UNKNOWN -- it may already be resting at the market. It was NOT retried. Further ${input.symbol} orders are blocked until this is reconciled.`,
        },
      };
    }

    // (f) A definite 4xx. The order was not accepted; keep the broker's words.
    if (e instanceof AlpacaHttpError) {
      await setIntent(clientOrderId, {
        state: "rejected" satisfies IntentState,
        last_error: e.body,
      });
      await audit(input.userId, "order_rejected", { clientOrderId, status: e.status, body: e.body });
      return { status: 422, body: { placed: false, clientOrderId, brokerStatus: e.status, brokerError: e.body, message: "Broker rejected the order." } };
    }
    throw e;
  }

  // Success. Persist the broker's record verbatim.
  await persistBrokerOrder(input.userId, input.mode, order);
  await setIntent(clientOrderId, {
    state: "submitted" satisfies IntentState,
    broker_order_id: String(order.id),
  });
  await audit(input.userId, "order_submitted", { clientOrderId, brokerOrderId: order.id, symbol: input.symbol, side: input.side, qty: input.qty });

  return {
    status: 201,
    body: {
      placed: true,
      clientOrderId,
      brokerOrderId: order.id,
      // Straight from the broker; we add nothing.
      status: order.status,
      filled_qty: order.filled_qty,
      filled_avg_price: order.filled_avg_price,
      order,
    },
  };
}
