"use client";

import React, { useState, useEffect } from "react";

/**
 * Market Mind Portfolio Page
 * Renders the active positions table with real-time data simulation.
 */

interface Position {
  ticker: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
  pnlPercent: number;
}

const MOCK_POSITIONS: Position[] = [
  {
    ticker: "AAPL",
    quantity: 50,
    avgPrice: 185.20,
    currentPrice: 192.45,
    marketValue: 9622.50,
    pnl: 362.50,
    pnlPercent: 3.92,
  },
  {
    ticker: "TSLA",
    quantity: 20,
    avgPrice: 245.00,
    currentPrice: 238.10,
    marketValue: 4762.00,
    pnl: -138.00,
    pnlPercent: -2.82,
  },
  {
    ticker: "NVDA",
    quantity: 10,
    avgPrice: 450.00,
    currentPrice: 485.20,
    marketValue: 4852.00,
    pnl: 352.00,
    pnlPercent: 7.82,
  },
  {
    ticker: "MSFT",
    quantity: 15,
    avgPrice: 370.00,
    currentPrice: 375.50,
    marketValue: 5632.50,
    pnl: 82.50,
    pnlPercent: 1.49,
  },
];

const Skeleton = ({ height }: { height: string }) => (
  <div 
    className="w-full animate-pulse bg-[var(--color-surface-2)] border-b border-[var(--color-border)]"
    style={{ height }}
  />
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-[var(--space-6)] text-center">
    <svg 
      width="40" 
      height="40" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="var(--color-text-secondary)" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className="mb-[var(--space-2)]"
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
    <p className="font-[family-name:var(--font-display)] text-[16px] font-medium text-[var(--color-text-secondary)]">
      No active positions.
    </p>
  </div>
);

export default function PortfolioPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    // Simulate data fetch
    const timer = setTimeout(() => {
      setPositions(MOCK_POSITIONS);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      {/* Top Bar */}
      <header className="flex items-center h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Portfolio
        </h1>
      </header>

      {/* Content Area */}
      <section className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {[
                "Ticker",
                "Position",
                "Avg Price",
                "Current Price",
                "Value",
                "P&L",
                "P&L %",
              ].map((header) => (
                <th 
                  key={header}
                  className="px-[12px] py-[8px] text-[11px] font-normal uppercase tracking-[0.08em] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td colSpan={7} className="p-0">
                    <Skeleton height="44px" />
                  </td>
                </tr>
              ))
            ) : positions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState />
                </td>
              </tr>
            ) : (
              positions.map((pos) => (
                <tr 
                  key={pos.ticker}
                  className="h-[44px] border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors cursor-default"
                >
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-ticker)] font-medium text-[var(--color-text-primary)]">
                    {pos.ticker}
                  </td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] text-[var(--color-text-primary)]">
                    {pos.quantity}
                  </td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] text-[var(--color-text-primary)]">
                    ${pos.avgPrice.toFixed(2)}
                  </td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] text-[var(--color-text-primary)]">
                    ${pos.currentPrice.toFixed(2)}
                  </td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] text-[var(--color-text-primary)]">
                    ${pos.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td 
                    className={`px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] ${
                      pos.pnl > 0 
                        ? "text-[var(--color-gain)]" 
                        : pos.pnl < 0 
                        ? "text-[var(--color-loss)]" 
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {pos.pnl > 0 ? "+" : ""}{pos.pnl.toFixed(2)}
                  </td>
                  <td 
                    className={`px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] ${
                      pos.pnlPercent > 0 
                        ? "text-[var(--color-gain)]" 
                        : pos.pnlPercent < 0 
                        ? "text-[var(--color-loss)]" 
                        : "text-[var(--color-text-muted)]"
                    }`}
                  >
                    {pos.pnlPercent > 0 ? "+" : ""}{pos.pnlPercent.toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
