import "server-only";
import { getServiceClient } from "@/lib/api/serviceRole";
import { persistBrokerOrder, syncBrokerPositions } from "@/lib/broker/submit-order";
import { AlpacaHttpError, type AlpacaClient } from "@/lib/broker/alpaca";

// Reconciliation: re-read the broker and make our mirror equal to it.
//
// submitOrder persists the order as it stood at the instant of submission,
// which is nearly always "pending_new" with no fill. That snapshot is true
// when written and stale a second later. A mirror that is only ever written
// once is not a mirror -- it is a log of intentions wearing a mirror's name.
// Nothing may read broker_orders as current unless something refreshes it,
// and this is that something.
//
// It is also the resolution path for `unknown_needs_reconcile`: an intent
// whose POST outcome we never learned is settled here by asking the broker
// what it actually has, which is the only authority on the question.

export interface ReconcileResult {
  ordersChecked: number;
  ordersUpdated: number;
  intentsResolved: number;
  positions: number;
  details: Array<Record<string, unknown>>;
}

export async function reconcile(
  userId: string,
  mode: string,
  client: AlpacaClient
): Promise<ReconcileResult> {
  const svc = getServiceClient();
  const out: ReconcileResult = {
    ordersChecked: 0,
    ordersUpdated: 0,
    intentsResolved: 0,
    positions: 0,
    details: [],
  };
  if (!svc) return out;

  // Every intent that could correspond to something at the broker. Intents
  // refused by preflight never reached the network, so they are skipped.
  const { data: intents } = await svc
    .from("order_intents")
    .select("client_order_id, state, symbol, broker_order_id")
    .eq("user_id", userId)
    .eq("mode", mode)
    .in("state", [
      "intent_created",
      "submitted",
      "adopted_duplicate",
      "unknown_needs_reconcile",
    ]);

  for (const intent of intents || []) {
    out.ordersChecked++;
    try {
      const order = await client.getOrderByClientOrderId(intent.client_order_id);
      await persistBrokerOrder(userId, mode, order);
      out.ordersUpdated++;

      // An intent we were unsure about is now settled by the broker's answer.
      const wasUnknown = intent.state === "unknown_needs_reconcile";
      await svc
        .from("order_intents")
        .update({
          state: "submitted",
          broker_order_id: String(order.id),
          updated_at: new Date().toISOString(),
        })
        .eq("client_order_id", intent.client_order_id);
      if (wasUnknown) {
        out.intentsResolved++;
        await svc.from("broker_audit_log").insert({
          user_id: userId,
          event: "intent_reconciled",
          detail: {
            client_order_id: intent.client_order_id,
            found_at_broker: true,
            broker_order_id: order.id,
            broker_status: order.status,
          },
        });
      }
      out.details.push({
        client_order_id: intent.client_order_id,
        broker_status: order.status,
        filled_qty: order.filled_qty,
        filled_avg_price: order.filled_avg_price,
      });
    } catch (e) {
      // 404: the broker has no such order, so it never landed. That is a
      // definite answer and it unblocks the symbol.
      if (e instanceof AlpacaHttpError && e.status === 404) {
        await svc
          .from("order_intents")
          .update({
            state: "resolved_not_at_broker",
            last_error: "Broker has no order with this client_order_id.",
            updated_at: new Date().toISOString(),
          })
          .eq("client_order_id", intent.client_order_id);
        out.intentsResolved++;
        await svc.from("broker_audit_log").insert({
          user_id: userId,
          event: "intent_reconciled",
          detail: { client_order_id: intent.client_order_id, found_at_broker: false },
        });
        out.details.push({ client_order_id: intent.client_order_id, found_at_broker: false });
        continue;
      }
      // Anything else leaves the intent exactly as it was. An unresolved
      // intent must stay unresolved rather than be optimistically cleared.
      out.details.push({
        client_order_id: intent.client_order_id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const positions = await syncBrokerPositions(userId, mode, client);
  out.positions = positions.length;
  return out;
}

/**
 * Reconcile every non-sim account. This is what the scheduled job calls:
 * there is no session behind a cron, so it works from broker_config rather
 * than from a logged-in user. Accounts whose configured mode disagrees with
 * the server's broker connection are skipped rather than reconciled against
 * the wrong venue.
 */
export async function reconcileAllAccounts(): Promise<{
  accounts: number;
  skipped: number;
  results: Array<Record<string, unknown>>;
}> {
  const svc = getServiceClient();
  const out = { accounts: 0, skipped: 0, results: [] as Array<Record<string, unknown>> };
  if (!svc) return out;

  const { client } = (await import("@/lib/broker/alpaca")).resolveAlpacaClient();
  if (!client) return out;

  const { data: configs } = await svc
    .from("broker_config")
    .select("user_id, mode")
    .neq("mode", "sim");

  for (const cfg of configs || []) {
    if (cfg.mode !== client.mode) {
      out.skipped++;
      continue;
    }
    const r = await reconcile(cfg.user_id, cfg.mode, client);
    out.accounts++;
    out.results.push({ user_id: cfg.user_id, mode: cfg.mode, ...r });
  }
  return out;
}
