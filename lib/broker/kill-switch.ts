import "server-only";
import { getServiceClient } from "@/lib/api/serviceRole";
import { resolveAlpacaClient } from "@/lib/broker/alpaca";
import { persistBrokerOrder, syncBrokerPositions } from "@/lib/broker/submit-order";

// The kill switch. Order matters and is not negotiable:
//
//   1. Flip kill_switch_active FIRST. Preflight checks it before anything
//      else, so from this instant no new order can pass the app layer. Doing
//      this after the broker calls would leave a window in which a request
//      could slip through while we were busy cancelling.
//   2. DELETE /v2/orders -- cancel everything already resting.
//   3. PATCH /v2/account/configurations {"suspend_trade": true} -- stop the
//      account at the broker, so anything holding stale credentials is also
//      stopped, not just this application.
//   4. READ BACK trade_suspended_by_user from the broker.
//
// Step 4 is what makes this real. Our own flag proves only that we intend the
// account to be halted; the broker's own answer is the only thing that proves
// it IS. A kill switch that reports success without confirmation is the most
// dangerous control in the system, because it is trusted precisely when
// everything else is going wrong.

export interface KillResult {
  ok: boolean;
  steps: Array<{ step: string; ok: boolean; detail?: unknown; error?: string }>;
  confirmedByBroker: boolean;
  tradeSuspendedByUser: boolean | null;
}

export async function engageKillSwitch(
  userId: string,
  reason: string
): Promise<KillResult> {
  const steps: KillResult["steps"] = [];
  const svc = getServiceClient();
  if (!svc) {
    return {
      ok: false,
      steps: [{ step: "service_client", ok: false, error: "no service credentials" }],
      confirmedByBroker: false,
      tradeSuspendedByUser: null,
    };
  }

  // 1. App layer first.
  const { error: flagErr } = await svc
    .from("broker_config")
    .update({ kill_switch_active: true })
    .eq("user_id", userId);
  steps.push({
    step: "1_block_app_layer",
    ok: !flagErr,
    error: flagErr?.message,
    detail: "kill_switch_active = true; preflight refuses before any other check",
  });
  await svc.from("broker_audit_log").insert({
    user_id: userId,
    event: "kill_switch_engaged",
    detail: { reason },
  });

  const { client, reason: clientReason } = resolveAlpacaClient();
  if (!client) {
    steps.push({ step: "broker_client", ok: false, error: clientReason });
    return { ok: false, steps, confirmedByBroker: false, tradeSuspendedByUser: null };
  }

  // 2. Cancel everything resting.
  try {
    const canceled = await client.cancelAll();
    steps.push({
      step: "2_cancel_all_open_orders",
      ok: true,
      detail: Array.isArray(canceled)
        ? canceled.map((c) => ({ id: c.id, status: c.status }))
        : canceled,
    });
  } catch (e) {
    steps.push({
      step: "2_cancel_all_open_orders",
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // 3. Halt the account at the broker.
  try {
    const cfg = await client.setTradingSuspended(true);
    steps.push({ step: "3_suspend_trade_at_broker", ok: true, detail: cfg });
  } catch (e) {
    steps.push({
      step: "3_suspend_trade_at_broker",
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // 4. The broker's own word. Nothing above counts without this.
  let tradeSuspendedByUser: boolean | null = null;
  try {
    const account = await client.getAccount();
    tradeSuspendedByUser = Boolean(account.trade_suspended_by_user);
    steps.push({
      step: "4_read_back_from_broker",
      ok: tradeSuspendedByUser === true,
      detail: {
        account_number: account.account_number,
        trade_suspended_by_user: account.trade_suspended_by_user,
        trading_blocked: account.trading_blocked,
      },
    });
  } catch (e) {
    steps.push({
      step: "4_read_back_from_broker",
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Refresh the mirror so the cancellations are visible in our tables too.
  try {
    const open = await client.getOrders({ status: "all", limit: 50 });
    for (const o of open) await persistBrokerOrder(userId, client.mode, o);
    await syncBrokerPositions(userId, client.mode, client);
  } catch {
    /* mirror refresh is best-effort */
  }

  const confirmedByBroker = tradeSuspendedByUser === true;
  await svc.from("broker_audit_log").insert({
    user_id: userId,
    event: confirmedByBroker ? "kill_switch_confirmed_by_broker" : "kill_switch_unconfirmed",
    detail: { steps, trade_suspended_by_user: tradeSuspendedByUser },
  });

  return {
    ok: steps.every((s) => s.ok) && confirmedByBroker,
    steps,
    confirmedByBroker,
    tradeSuspendedByUser,
  };
}

/**
 * Clear the halt. Reverse order: the broker is released first and confirmed,
 * and only then is the app-layer flag cleared -- so there is never a moment
 * when the app believes trading is permitted while the broker still refuses,
 * or worse, when the app is open and the broker is silently still suspended.
 */
export async function releaseKillSwitch(userId: string): Promise<KillResult> {
  const steps: KillResult["steps"] = [];
  const svc = getServiceClient();
  if (!svc) {
    return {
      ok: false,
      steps: [{ step: "service_client", ok: false, error: "no service credentials" }],
      confirmedByBroker: false,
      tradeSuspendedByUser: null,
    };
  }

  const { client, reason: clientReason } = resolveAlpacaClient();
  if (!client) {
    steps.push({ step: "broker_client", ok: false, error: clientReason });
    return { ok: false, steps, confirmedByBroker: false, tradeSuspendedByUser: null };
  }

  try {
    const cfg = await client.setTradingSuspended(false);
    steps.push({ step: "1_unsuspend_trade_at_broker", ok: true, detail: cfg });
  } catch (e) {
    steps.push({
      step: "1_unsuspend_trade_at_broker",
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  let tradeSuspendedByUser: boolean | null = null;
  try {
    const account = await client.getAccount();
    tradeSuspendedByUser = Boolean(account.trade_suspended_by_user);
    steps.push({
      step: "2_read_back_from_broker",
      ok: tradeSuspendedByUser === false,
      detail: {
        account_number: account.account_number,
        trade_suspended_by_user: account.trade_suspended_by_user,
      },
    });
  } catch (e) {
    steps.push({
      step: "2_read_back_from_broker",
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Only now, with the broker confirmed released, reopen the app layer.
  if (tradeSuspendedByUser === false) {
    const { error } = await svc
      .from("broker_config")
      .update({ kill_switch_active: false })
      .eq("user_id", userId);
    steps.push({ step: "3_unblock_app_layer", ok: !error, error: error?.message });
  } else {
    steps.push({
      step: "3_unblock_app_layer",
      ok: false,
      error: "broker did not confirm release; app layer stays blocked",
    });
  }

  await svc.from("broker_audit_log").insert({
    user_id: userId,
    event: "kill_switch_released",
    detail: { steps, trade_suspended_by_user: tradeSuspendedByUser },
  });

  return {
    ok: steps.every((s) => s.ok),
    steps,
    confirmedByBroker: tradeSuspendedByUser === false,
    tradeSuspendedByUser,
  };
}
