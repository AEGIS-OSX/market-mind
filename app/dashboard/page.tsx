"use client";

import React, { useEffect, useState } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import { usePortfolio } from "@/lib/hooks/usePortfolio";
import { fmtMoney, fmtPct, Provenance } from "@/components/ui/provenance";

interface Clock {
  open: boolean;
  label: string;
  etTime: string;
}

// T-010: dashboard consumes usePortfolio(); loading renders skeleton
// MetricCards; errors render inline in var(--color-loss) — no alert modal.
export default function DashboardPage() {
  const { cash, startingCash, holdings, totals, loading, error, label } = usePortfolio();
  const [clock, setClock] = useState<Clock | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () =>
      fetch("/api/market/clock")
        .then((r) => r.json())
        .then((c) => mounted && setClock(c))
        .catch(() => {});
    load();
    const t = setInterval(load, 60_000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const pricedHoldings = holdings.filter((h) => h.price != null);
  const newestAsOf = pricedHoldings
    .map((h) => h.priceAsOf!)
    .sort()
    .slice(-1)[0];
  const anySource = pricedHoldings[0]?.priceSource;
  const anyFreshness = pricedHoldings[0]?.freshness;

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      {/* Page header */}
      <header className="flex items-center justify-between h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Dashboard
        </h1>
        <div className="flex items-center gap-[8px]">
          <span
            className="w-[6px] h-[6px] rounded-full"
            style={{
              backgroundColor: clock?.open ? "var(--color-gain)" : "var(--color-text-muted)",
            }}
          />
          <span className="font-[family-name:var(--font-body)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
            {clock ? clock.label : "Market status…"}
          </span>
        </div>
      </header>

      {/* Simulated-funds banner — every trading surface carries this */}
      <div className="px-[var(--space-3)] pt-[var(--space-2)]">
        <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--color-text-muted)] uppercase tracking-[0.08em]">
          {label || "Simulated portfolio — real market prices, simulated funds."}
        </p>
      </div>

      {/* Error state (T-010 #6): inline, var(--color-loss), with the reason */}
      {error && (
        <div className="px-[var(--space-3)] pt-[var(--space-2)]">
          <p
            role="alert"
            className="font-[family-name:var(--font-body)] text-[13px]"
            style={{ color: "var(--color-loss)" }}
          >
            Action failed. Try again.{" "}
            <span className="text-[11px] opacity-80">({error})</span>
          </p>
        </div>
      )}

      {/* Metric cards */}
      <section className="p-[var(--space-3)] grid grid-cols-2 gap-[var(--space-2)] xl:grid-cols-4">
        <MetricCard
          label="Portfolio Value"
          value={totals ? fmtMoney(totals.portfolioValue) : "—"}
          loading={loading}
        />
        <MetricCard
          label="Open P&L"
          value={totals ? fmtMoney(totals.openPnl) : "—"}
          delta={totals && totals.marketValue > 0 ? fmtPct((totals.openPnl / (totals.marketValue - totals.openPnl || 1)) * 100) : undefined}
          deltaType={totals ? (totals.openPnl >= 0 ? "gain" : "loss") : "neutral"}
          loading={loading}
        />
        <MetricCard
          label="Closed P&L"
          value={totals ? fmtMoney(totals.closedPnl) : "—"}
          deltaType={totals ? (totals.closedPnl >= 0 ? "gain" : "loss") : "neutral"}
          loading={loading}
        />
        <MetricCard
          label="Total Return"
          value={totals ? fmtPct(totals.totalReturnPct) : "—"}
          deltaType={totals ? (totals.totalReturnPct >= 0 ? "gain" : "loss") : "neutral"}
          loading={loading}
        />
      </section>

      {/* Cash + provenance line */}
      {!loading && !error && (
        <section className="px-[var(--space-3)] flex flex-col gap-[6px]">
          <p className="font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
            Cash {fmtMoney(cash)} · Simulated starting balance {fmtMoney(startingCash)}
            {totals?.partial && (
              <span style={{ color: "var(--color-alert)" }}>
                {" "}
                · some holdings excluded from totals (price unavailable)
              </span>
            )}
          </p>
          {pricedHoldings.length > 0 ? (
            <Provenance source={anySource} asOf={newestAsOf} freshness={anyFreshness} />
          ) : (
            <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--color-text-muted)]">
              No open positions — portfolio value is cash only. Place a simulated
              order from Portfolio or Signals to see live-priced holdings.
            </p>
          )}
        </section>
      )}

      {/* Disclaimer */}
      <footer className="mt-auto px-[var(--space-3)] py-[var(--space-2)] border-t border-[var(--color-border)]">
        <p className="font-[family-name:var(--font-body)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
          Market Mind is not a registered investment advisor. All trading involves
          risk. Past performance does not guarantee future results. This is a
          simulated portfolio: funds are not real; market prices are.
        </p>
      </footer>
    </main>
  );
}
