"use client";

import React, { useCallback, useEffect, useState } from "react";

// The broker surface. Everything here is REAL broker state -- a live account
// at Alpaca, real orders, real positions. The rest of this dashboard is the
// simulated engine. The two must never be mistaken for one another, so this
// page says which it is at the top, in the banner, and on every table.

interface BrokerState {
  mode: string;
  killSwitchActive: boolean;
  liveEnabled: boolean;
  limits: Record<string, number | null>;
  account: Record<string, unknown> | null;
  accountError: string | null;
  orders: Array<Record<string, unknown>>;
  positions: Array<Record<string, unknown>>;
  intents: Array<Record<string, unknown>>;
}

const money = (v: unknown) =>
  v == null || v === "" ? "—" : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BrokerPage() {
  const [state, setState] = useState<BrokerState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/broker/state");
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setState(d);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const isReal = state ? state.mode !== "sim" : false;

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      <header className="flex items-center justify-between h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Broker
        </h1>
        <span
          className="px-[10px] py-[4px] rounded-[4px] text-[11px] font-[family-name:var(--font-body)] font-[600] uppercase tracking-[0.08em]"
          style={
            isReal
              ? { backgroundColor: "var(--color-alert)", color: "var(--color-accent-ink)" }
              : { backgroundColor: "var(--color-surface-3)", color: "var(--color-text-muted)" }
          }
        >
          {state ? `${state.mode} account` : "…"}
        </span>
      </header>

      {isReal && (
        <div
          className="mx-[var(--space-3)] mt-[var(--space-2)] px-[14px] py-[10px] rounded-[var(--radius-panel)] border"
          style={{ borderColor: "var(--color-alert)" }}
        >
          <p className="font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-primary)] leading-[1.6]">
            <strong>These are real broker orders</strong>, placed with a live Alpaca{" "}
            {state?.mode} account — <strong>not</strong> the simulated portfolio shown on
            Dashboard, Portfolio and Trade History. Positions and fills below come from the
            broker&apos;s own records.
          </p>
        </div>
      )}

      {state?.killSwitchActive && (
        <p
          role="alert"
          className="mx-[var(--space-3)] mt-[var(--space-2)] px-[14px] py-[10px] rounded-[var(--radius-panel)] font-[family-name:var(--font-body)] text-[13px]"
          style={{ backgroundColor: "var(--color-loss)", color: "var(--color-text-primary)" }}
        >
          KILL SWITCH ACTIVE — all broker trading is halted for this account.
        </p>
      )}

      {error && (
        <p role="alert" className="px-[var(--space-3)] pt-[var(--space-2)] text-[13px]" style={{ color: "var(--color-loss)" }}>
          {error}
        </p>
      )}
      {loading && !state && (
        <p className="px-[var(--space-3)] pt-[var(--space-3)] text-[13px] text-[var(--color-text-secondary)]">Loading broker state…</p>
      )}

      {state && (
        <section className="p-[var(--space-3)] flex flex-col gap-[var(--space-3)]">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-[600] text-[var(--color-text-primary)] mb-[8px]">
              Account (live from broker)
            </h2>
            {state.account ? (
              <div className="flex flex-wrap gap-x-[28px] gap-y-[6px] font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)] [font-feature-settings:'tnum']">
                <span>Account <strong className="text-[var(--color-text-primary)]">{String(state.account.account_number)}</strong></span>
                <span>Status <strong className="text-[var(--color-text-primary)]">{String(state.account.status)}</strong></span>
                <span>Equity <strong className="text-[var(--color-text-primary)]">{money(state.account.equity)}</strong></span>
                <span>Cash <strong className="text-[var(--color-text-primary)]">{money(state.account.cash)}</strong></span>
                <span>Buying power <strong className="text-[var(--color-text-primary)]">{money(state.account.buying_power)}</strong></span>
                <span>Trading suspended <strong className="text-[var(--color-text-primary)]">{String(state.account.trade_suspended_by_user)}</strong></span>
              </div>
            ) : (
              <p className="text-[13px] text-[var(--color-text-muted)]">
                {state.accountError ? `Broker unreachable: ${state.accountError}` : "No broker account connected."}
              </p>
            )}
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-[600] text-[var(--color-text-primary)] mb-[8px]">
              Broker positions
            </h2>
            {state.positions.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">No open broker positions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-[family-name:var(--font-body)] text-[13px] [font-feature-settings:'tnum']">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      <th className="py-[6px] pr-[16px]">Ticker</th><th className="pr-[16px]">Mode</th><th className="pr-[16px]">Qty</th>
                      <th className="pr-[16px]">Avg entry</th><th className="pr-[16px]">Market value</th><th>Unrealized P&amp;L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.positions.map((p) => (
                      <tr key={String(p.symbol)} className="border-t border-[var(--color-border)] text-[var(--color-text-primary)]">
                        <td className="py-[8px] pr-[16px] font-[500]">{String(p.symbol)}</td>
                        <td className="pr-[16px] uppercase text-[11px] text-[var(--color-text-muted)]">{String(p.mode)}</td>
                        <td className="pr-[16px]">{String(p.qty)}</td>
                        <td className="pr-[16px]">{money(p.avg_entry_price)}</td>
                        <td className="pr-[16px]">{money(p.market_value)}</td>
                        <td style={{ color: Number(p.unrealized_pnl) >= 0 ? "var(--color-gain)" : "var(--color-loss)" }}>{money(p.unrealized_pnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-[600] text-[var(--color-text-primary)] mb-[8px]">
              Broker orders
            </h2>
            {state.orders.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">No broker orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-[family-name:var(--font-body)] text-[13px] [font-feature-settings:'tnum']">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      <th className="py-[6px] pr-[16px]">Submitted</th><th className="pr-[16px]">Ticker</th><th className="pr-[16px]">Side</th>
                      <th className="pr-[16px]">Qty</th><th className="pr-[16px]">Filled</th><th className="pr-[16px]">Avg fill</th>
                      <th className="pr-[16px]">Status</th><th>Broker order id</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.orders.map((o) => (
                      <tr key={String(o.broker_order_id)} className="border-t border-[var(--color-border)] text-[var(--color-text-primary)]">
                        <td className="py-[8px] pr-[16px] text-[12px] text-[var(--color-text-secondary)]">{o.submitted_at ? new Date(String(o.submitted_at)).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) + " ET" : "—"}</td>
                        <td className="pr-[16px] font-[500]">{String(o.symbol)}</td>
                        <td className="pr-[16px] uppercase" style={{ color: o.side === "buy" ? "var(--color-gain)" : "var(--color-loss)" }}>{String(o.side)}</td>
                        <td className="pr-[16px]">{String(o.qty)}</td>
                        <td className="pr-[16px]">{String(o.filled_qty ?? "0")}</td>
                        <td className="pr-[16px]">{money(o.avg_fill_price)}</td>
                        <td className="pr-[16px]">{String(o.status)}</td>
                        <td className="text-[11px] text-[var(--color-text-muted)]">{String(o.broker_order_id)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div>
            <h2 className="font-[family-name:var(--font-display)] text-[15px] font-[600] text-[var(--color-text-primary)] mb-[8px]">
              Order intents
            </h2>
            <p className="text-[12px] text-[var(--color-text-secondary)] mb-[8px] leading-[1.6] max-w-[820px]">
              Every order is written here before it is sent, so an order whose outcome we never
              learned is visible rather than silently lost.
            </p>
            {state.intents.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-muted)]">No order intents yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-[family-name:var(--font-body)] text-[13px] [font-feature-settings:'tnum']">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
                      <th className="py-[6px] pr-[16px]">Created</th><th className="pr-[16px]">Ticker</th><th className="pr-[16px]">Side</th>
                      <th className="pr-[16px]">Qty</th><th className="pr-[16px]">Limit</th><th className="pr-[16px]">State</th><th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.intents.map((i) => (
                      <tr key={String(i.client_order_id)} className="border-t border-[var(--color-border)] text-[var(--color-text-primary)]">
                        <td className="py-[8px] pr-[16px] text-[12px] text-[var(--color-text-secondary)]">{new Date(String(i.created_at)).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} ET</td>
                        <td className="pr-[16px] font-[500]">{String(i.symbol)}</td>
                        <td className="pr-[16px] uppercase">{String(i.side)}</td>
                        <td className="pr-[16px]">{String(i.qty)}</td>
                        <td className="pr-[16px]">{money(i.limit_price)}</td>
                        <td className="pr-[16px]" style={{ color: String(i.state) === "unknown_needs_reconcile" ? "var(--color-loss)" : "var(--color-text-primary)" }}>{String(i.state)}</td>
                        <td className="text-[11px] text-[var(--color-text-muted)] max-w-[280px] truncate">{i.last_error ? String(i.last_error) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
