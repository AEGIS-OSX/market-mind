"use client";

import React, { useState } from "react";
import { useSignals, type SignalRow } from "@/lib/hooks/useSignals";
import { Provenance, fmtMoney } from "@/components/ui/provenance";
import { Skeleton } from "@/components/ui/skeleton";

// Signals are computed server-side from real fetched daily bars with ONE
// deterministic rule (SMA 20/50 crossover) — the rule text arrives from the
// API and is displayed. No opaque scores anywhere on this page.

function ActionBadge({ action }: { action: "BUY" | "SELL" | "NONE" }) {
  const style =
    action === "BUY"
      ? "text-[var(--color-gain)] border-[var(--color-gain)]"
      : action === "SELL"
      ? "text-[var(--color-loss)] border-[var(--color-loss)]"
      : "text-[var(--color-text-muted)] border-[var(--color-border)]";
  return (
    <span className={`px-2 py-0.5 text-[11px] font-[family-name:var(--font-body)] font-medium border rounded-[4px] ${style}`}>
      {action === "NONE" ? "NO SIGNAL" : action}
    </span>
  );
}

function TradeButton({ row, onDone }: { row: SignalRow; onDone: (msg: string, ok: boolean) => void }) {
  const [busy, setBusy] = useState(false);
  if (!row.outcome || row.outcome.kind !== "signal" || row.outcome.action === "NONE") return null;
  const side = row.outcome.action === "BUY" ? "buy" : "sell";
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/trade/execute", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // The tap IS the one-tap approval required in recommend mode.
            body: JSON.stringify({ symbol: row.symbol, side, quantity: 1, approved: true }),
          });
          const d = await res.json();
          onDone(res.ok ? d.message : `Action failed. Try again. (${d.error})`, res.ok);
        } catch {
          onDone("Action failed. Try again.", false);
        } finally {
          setBusy(false);
        }
      }}
      className="px-[12px] py-[6px] text-[11px] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] disabled:opacity-60 transition-opacity"
      style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}
    >
      {busy ? "Submitting…" : `${row.outcome.action} 1 (simulated)`}
    </button>
  );
}

export default function SignalsPage() {
  const { rule, signals, loading, error } = useSignals();
  const [notice, setNotice] = useState<{ text: string; ok: boolean } | null>(null);

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      <header className="flex items-center justify-between h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Live Signals
        </h1>
        <span className="font-[family-name:var(--font-body)] text-[11px] text-[var(--color-text-muted)]">
          Simulated portfolio — real market prices, simulated funds.
        </span>
      </header>

      {/* The rule, visible next to the signals it produces */}
      {rule && (
        <p className="px-[var(--space-3)] pt-[var(--space-2)] font-[family-name:var(--font-body)] text-[12px] text-[var(--color-text-secondary)] leading-[1.6] max-w-[860px]">
          {rule}
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="px-[var(--space-3)] pt-[var(--space-2)] font-[family-name:var(--font-body)] text-[13px]"
          style={{ color: "var(--color-loss)" }}
        >
          Action failed. Try again. <span className="text-[11px] opacity-80">({error})</span>
        </p>
      )}

      {notice && (
        <p
          role={notice.ok ? "status" : "alert"}
          className="px-[var(--space-3)] pt-[var(--space-2)] font-[family-name:var(--font-body)] text-[13px]"
          style={{ color: notice.ok ? "var(--color-text-secondary)" : "var(--color-loss)" }}
        >
          {notice.text}
        </p>
      )}

      <section className="p-[var(--space-3)] flex flex-col gap-[var(--space-2)]">
        {/* T-010: loading renders 3 skeleton signal cards */}
        {loading &&
          [0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] p-[16px]"
            >
              <Skeleton width="220px" height="20px" />
              <div className="mt-[10px]">
                <Skeleton width="70%" height="14px" />
              </div>
            </div>
          ))}

        {!loading &&
          signals.map((row) => {
            const o = row.outcome;
            return (
              <div
                key={row.symbol}
                className={`bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] p-[16px] border-l-[3px] ${
                  o?.kind === "signal" && o.action === "BUY"
                    ? "border-l-[var(--color-gain)]"
                    : o?.kind === "signal" && o.action === "SELL"
                    ? "border-l-[var(--color-loss)]"
                    : "border-l-[var(--color-border)]"
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-[8px]">
                  <div className="flex items-center gap-[12px]">
                    <span className="font-[family-name:var(--font-body)] text-[var(--text-ticker)] font-[500] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                      {row.symbol}
                    </span>
                    {o?.kind === "signal" && <ActionBadge action={o.action} />}
                    {o?.kind === "insufficient" && (
                      <span className="text-[11px] font-[family-name:var(--font-body)] text-[var(--color-alert)]">
                        INSUFFICIENT DATA
                      </span>
                    )}
                    {!o && (
                      <span className="text-[11px] font-[family-name:var(--font-body)]" style={{ color: "var(--color-loss)" }}>
                        DATA UNAVAILABLE
                      </span>
                    )}
                  </div>
                  <TradeButton row={row} onDone={(text, ok) => setNotice({ text, ok })} />
                </div>

                {o?.kind === "signal" && (
                  <p className="mt-[8px] font-[family-name:var(--font-body)] text-[var(--text-rationale)] text-[var(--color-text-secondary)] leading-[1.6]">
                    SMA20 {fmtMoney(o.sma20)} · SMA50 {fmtMoney(o.sma50)} · spread{" "}
                    {o.spreadPct >= 0 ? "+" : ""}
                    {o.spreadPct.toFixed(2)}%
                    {o.crossoverDate ? ` · crossover ${o.crossoverDate}` : " · no crossover in the last 10 sessions"}
                    {" · last close "}
                    {fmtMoney(o.lastClose)} ({o.lastBarDate}) · {o.barsUsed} bars
                  </p>
                )}
                {o?.kind === "insufficient" && (
                  <p className="mt-[8px] font-[family-name:var(--font-body)] text-[var(--text-rationale)] text-[var(--color-text-secondary)] leading-[1.6]">
                    {o.reason}
                  </p>
                )}
                {!o && row.error && (
                  <p className="mt-[8px] font-[family-name:var(--font-body)] text-[12px]" style={{ color: "var(--color-loss)" }}>
                    No signal computed — market data fetch failed: {row.error}
                  </p>
                )}

                {row.source && (
                  <div className="mt-[6px]">
                    <Provenance
                      source={row.source}
                      asOf={row.fetchedAt}
                      freshness={row.stale ? "stale" : "eod"}
                    />
                  </div>
                )}
              </div>
            );
          })}

        {!loading && !error && signals.length === 0 && (
          <p className="font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
            Scanning NASDAQ for opportunities.
          </p>
        )}
      </section>
    </main>
  );
}
