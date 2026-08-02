"use client";

import React from "react";
import { usePortfolio } from "@/lib/hooks/usePortfolio";
import { Provenance, fmtMoney } from "@/components/ui/provenance";
import { Skeleton } from "@/components/ui/skeleton";
import { TradeTicket } from "@/components/ui/trade-ticket";

const HEADERS = ["Ticker", "Position", "Avg Price", "Current Price", "P&L", "Value", "Price Source"];

export default function PortfolioPage() {
  const { holdings, cash, totals, loading, error, refetch } = usePortfolio();

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      <header className="flex items-center justify-between h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Portfolio
        </h1>
        <span className="font-[family-name:var(--font-body)] text-[11px] text-[var(--color-text-muted)]">
          Simulated portfolio — real market prices, simulated funds.
        </span>
      </header>

      {error && (
        <p
          role="alert"
          className="px-[var(--space-3)] pt-[var(--space-2)] font-[family-name:var(--font-body)] text-[13px]"
          style={{ color: "var(--color-loss)" }}
        >
          Action failed. Try again. <span className="text-[11px] opacity-80">({error})</span>
        </p>
      )}

      <section className="p-[var(--space-3)] flex flex-col gap-[var(--space-2)]">
        <TradeTicket onExecuted={refetch} />

        {!loading && !error && (
          <p className="font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
            Cash {fmtMoney(cash)}
            {totals && <> · Market value {fmtMoney(totals.marketValue)}</>}
            {totals?.partial && (
              <span style={{ color: "var(--color-alert)" }}>
                {" "}· some holdings excluded from totals (price unavailable)
              </span>
            )}
          </p>
        )}

        <div className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr>
                {HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-[12px] py-[8px] text-[11px] font-normal uppercase tracking-[0.08em] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading &&
                [0, 1, 2].map((i) => (
                  <tr key={i}>
                    {HEADERS.map((h) => (
                      <td key={h} className="px-[12px] py-[10px]">
                        <Skeleton height="14px" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!loading &&
                holdings.map((h) => {
                  const pnlColor =
                    h.openPnl == null
                      ? "var(--color-text-muted)"
                      : h.openPnl >= 0
                      ? "var(--color-gain)"
                      : "var(--color-loss)";
                  return (
                    <tr key={h.symbol} className="border-b border-[var(--color-border)] last:border-b-0">
                      <td className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[var(--text-ticker)] font-[500] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                        {h.symbol}
                      </td>
                      <td className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
                        {h.quantity}
                      </td>
                      <td className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
                        {fmtMoney(h.avgCost)}
                      </td>
                      <td className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-primary)]">
                        {h.price != null ? (
                          fmtMoney(h.price)
                        ) : (
                          <span style={{ color: "var(--color-loss)" }} title={h.priceError}>
                            unavailable
                          </span>
                        )}
                      </td>
                      <td className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[13px]" style={{ color: pnlColor }}>
                        {h.openPnl != null ? fmtMoney(h.openPnl) : "—"}
                      </td>
                      <td className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-primary)]">
                        {h.marketValue != null ? fmtMoney(h.marketValue) : "excluded"}
                      </td>
                      <td className="px-[12px] py-[10px]">
                        {h.price != null ? (
                          <Provenance source={h.priceSource} asOf={h.priceAsOf} freshness={h.freshness} />
                        ) : (
                          <span className="text-[11px] font-[family-name:var(--font-body)]" style={{ color: "var(--color-loss)" }}>
                            {h.priceError || "quote failed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {!loading && !error && holdings.length === 0 && (
                <tr>
                  <td
                    colSpan={HEADERS.length}
                    className="px-[12px] py-[24px] text-center font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-muted)]"
                  >
                    No active positions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
