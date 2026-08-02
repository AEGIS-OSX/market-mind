"use client";

import React from "react";
import { useTradeHistory } from "@/lib/hooks/useTradeHistory";
import { Provenance, fmtMoney } from "@/components/ui/provenance";
import { Skeleton } from "@/components/ui/skeleton";

const HEADERS = ["Date", "Ticker", "Action", "Quantity", "Fill Price", "Price Source", "Realized P&L"];

function csvEscape(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function HistoryPage() {
  const { trades, loading, error } = useTradeHistory();

  const exportCsv = () => {
    const header = ["executed_at", "symbol", "side", "quantity", "price", "price_source", "price_as_of", "realized_pnl"];
    const rows = trades.map((t) =>
      [t.executed_at, t.symbol, t.side, t.quantity, t.price, t.price_source, t.price_as_of, t.realized_pnl]
        .map(csvEscape)
        .join(",")
    );
    const blob = new Blob([header.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "market-mind-trades.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      <header className="flex items-center justify-between h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Trade History
        </h1>
        <div className="flex items-center gap-[12px]">
          <span className="font-[family-name:var(--font-body)] text-[11px] text-[var(--color-text-muted)]">
            Simulated portfolio — real market prices, simulated funds.
          </span>
          <button
            onClick={exportCsv}
            disabled={!trades.length}
            className="px-[12px] py-[6px] text-[11px] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-50 transition-colors"
          >
            Export CSV
          </button>
        </div>
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

      <section className="p-[var(--space-3)]">
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
                trades.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--color-border)] last:border-b-0">
                    <td className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
                      {new Date(t.executed_at).toLocaleString("en-US", {
                        timeZone: "America/New_York",
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}{" "}
                      ET
                    </td>
                    <td className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[var(--text-ticker)] font-[500] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                      {t.symbol}
                    </td>
                    <td
                      className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[13px] uppercase"
                      style={{ color: t.side === "buy" ? "var(--color-gain)" : "var(--color-loss)" }}
                    >
                      {t.side}
                    </td>
                    <td className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)]">
                      {t.quantity}
                    </td>
                    <td className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-primary)]">
                      {fmtMoney(t.price)}
                    </td>
                    <td className="px-[12px] py-[10px]">
                      {t.price_source ? (
                        <Provenance source={t.price_source} asOf={t.price_as_of} />
                      ) : (
                        <span className="text-[11px] font-[family-name:var(--font-body)] text-[var(--color-alert)]" title="Recorded before provenance tracking existed">
                          legacy row — no source recorded
                        </span>
                      )}
                    </td>
                    <td
                      className="px-[12px] py-[10px] font-[family-name:var(--font-body)] text-[13px]"
                      style={{
                        color:
                          t.realized_pnl == null
                            ? "var(--color-text-muted)"
                            : t.realized_pnl >= 0
                            ? "var(--color-gain)"
                            : "var(--color-loss)",
                      }}
                    >
                      {t.realized_pnl != null ? fmtMoney(t.realized_pnl) : "—"}
                    </td>
                  </tr>
                ))}
              {!loading && !error && trades.length === 0 && (
                <tr>
                  <td
                    colSpan={HEADERS.length}
                    className="px-[12px] py-[24px] text-center font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-muted)]"
                  >
                    No trades executed yet.
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
