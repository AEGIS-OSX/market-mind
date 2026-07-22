"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Market Mind - Signals Feed Page
 * Built to Raycast-level visual density and engineering standards.
 */

interface Signal {
  id: string;
  ticker: string;
  action: "BUY" | "SELL" | "HOLD";
  confidence: number;
  timestamp: string;
  rationale: string;
}

const MOCK_SIGNALS: Signal[] = [
  {
    id: "1",
    ticker: "NVDA",
    action: "BUY",
    confidence: 88,
    timestamp: "10:45:02 AM",
    rationale: "Strong momentum in AI chip demand coupled with a breakout above the 20-day moving average. RSI indicates room for further upside before overbought conditions.",
  },
  {
    id: "2",
    ticker: "AAPL",
    action: "HOLD",
    confidence: 65,
    timestamp: "10:42:15 AM",
    rationale: "Consolidating near historical resistance. Volume is tapering, suggesting a wait-and-see approach until the next earnings catalyst or macro shift.",
  },
  {
    id: "3",
    ticker: "TSLA",
    action: "SELL",
    confidence: 42,
    timestamp: "10:38:50 AM",
    rationale: "Bearish engulfing pattern on the hourly chart. Increasing sell volume and a breakdown of the primary trendline suggest a short-term correction to the $240 support level.",
  },
];

const StatusBadge = ({ variant, label }: { variant: "buy" | "sell" | "hold"; label: string }) => {
  const colors = {
    buy: "text-[var(--color-gain)] border-[var(--color-gain)]",
    sell: "text-[var(--color-loss)] border-[var(--color-loss)]",
    hold: "text-[var(--color-alert)] border-[var(--color-alert)]",
  };

  return (
    <span className={`px-2 py-0.5 text-[11px] font-[family-name:var(--font-body)] font-medium border rounded-[4px] ${colors[variant]}`}>
      {label}
    </span>
  );
};

export default function SignalsPage() {
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [executionMode] = useState<"Auto-trade" | "Recommend only">("Recommend only");

  const selectedSignal = useMemo(
    () => MOCK_SIGNALS.find((s) => s.id === selectedSignalId),
    [selectedSignalId]
  );

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-[var(--color-gain)]";
    if (score >= 60) return "text-[var(--color-alert)]";
    return "text-[var(--color-loss)]";
  };

  const getBorderColor = (action: "BUY" | "SELL" | "HOLD") => {
    if (action === "BUY") return "border-l-[var(--color-gain)]";
    if (action === "SELL") return "border-l-[var(--color-loss)]";
    return "border-l-[var(--color-alert)]";
  };

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-text-primary)] font-[family-name:var(--font-body)]">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <h1 className="text-[22px] font-[family-name:var(--font-display)] font-medium">
          Live Signals
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-[12px] text-[var(--color-text-muted)] uppercase tracking-wider">
            Execution Mode:
          </span>
          <span className="text-[12px] font-medium text-[var(--color-accent)]">
            {executionMode}
          </span>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Signals List */}
        <section className="flex-1 overflow-y-auto p-6 space-y-3">
          {MOCK_SIGNALS.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text-muted)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 1 0 10 10" />
                <path d="M12 12L19 19" />
              </svg>
              <h2 className="text-[16px] font-[family-name:var(--font-display)] font-medium text-[var(--color-text-secondary)]">
                Scanning NASDAQ for opportunities.
              </h2>
            </div>
          ) : (
            MOCK_SIGNALS.map((signal) => (
              <article
                key={signal.id}
                tabIndex={0}
                role="button"
                aria-pressed={selectedSignalId === signal.id}
                onClick={() => setSelectedSignalId(signal.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedSignalId(signal.id);
                  }
                }}
                className={`
                  flex items-center justify-between p-4 
                  bg-[var(--color-surface-1)] 
                  border border-[var(--color-border)] 
                  border-l-4 ${getBorderColor(signal.action)}
                  rounded-[var(--radius-panel)] 
                  cursor-pointer transition-colors duration-200
                  hover:bg-[var(--color-surface-2)]
                  focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]
                  ${selectedSignalId === signal.id ? "bg-[var(--color-surface-2)] ring-1 ring-[var(--color-accent)]" : ""}
                `}
              >
                <div className="flex items-center gap-6">
                  <span className="text-[14px] font-medium w-12">
                    {signal.ticker}
                  </span>
                  <StatusBadge
                    variant={signal.action.toLowerCase() as "buy" | "sell" | "hold"}
                    label={signal.action}
                  />
                </div>

                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] text-[var(--color-text-muted)] uppercase">
                      Confidence
                    </span>
                    <span className={`text-[14px] font-medium ${getConfidenceColor(signal.confidence)}`}>
                      {signal.confidence}%
                    </span>
                  </div>
                  <span className="text-[13px] text-[var(--color-text-muted)] w-20 text-right">
                    {signal.timestamp}
                  </span>
                </div>
              </article>
            ))
          )}
        </section>

        {/* Rationale Panel */}
        <AnimatePresence>
          {selectedSignal && (
            <motion.aside
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="w-[320px] bg-[var(--color-surface-1)] border-l border-[var(--color-border)] flex flex-col"
            >
              <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between">
                <h2 className="text-[14px] font-[family-name:var(--font-display)] font-medium text-[var(--color-text-secondary)] uppercase tracking-wider">
                  Signal Rationale
                </h2>
                <button 
                  onClick={() => setSelectedSignalId(null)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                  aria-label="Close panel"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="mb-6">
                  <div className="text-[11px] text-[var(--color-text-muted)] uppercase mb-1">Asset</div>
                  <div className="text-[18px] font-medium">{selectedSignal.ticker}</div>
                </div>
                
                <p className="text-[14px] leading-[1.6] text-[var(--color-text-primary)] font-[family-name:var(--font-body)]">
                  {selectedSignal.rationale}
                </p>
              </div>

              {executionMode === "Recommend only" && (
                <div className="p-6 border-t border-[var(--color-border)]">
                  <button
                    disabled
                    aria-disabled="true"
                    className="w-full h-[44px] bg-[var(--color-accent)] text-[var(--color-canvas)] font-medium rounded-[var(--radius-button)] opacity-[0.55] cursor-not-allowed transition-opacity"
                  >
                    Execute Trade
                  </button>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </main>

      {/* Compliance Footer */}
      <footer className="px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-3)]">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          Market Mind is not a registered investment advisor. All trading involves risk. Past performance does not guarantee future results.
        </p>
      </footer>
    </div>
  );
}
