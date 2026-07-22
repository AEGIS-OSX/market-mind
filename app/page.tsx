"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { label: "Dashboard", active: true },
  { label: "Signals" },
  { label: "Portfolio" },
  { label: "Trade History" },
  { label: "Settings" },
];

const RISK_TIERS = ["Conservative", "Moderate", "Aggressive"] as const;
type RiskTier = (typeof RISK_TIERS)[number];

const PORTFOLIO_HEADERS = ["Ticker", "Position", "Avg Price", "Current Price", "P&L", "Value"];

export default function Home() {
  const [riskTier, setRiskTier] = useState<RiskTier>("Moderate");
  const [execMode, setExecMode] = useState<"auto" | "recommend">("recommend");
  const [contextOpen, setContextOpen] = useState(true);
  const [investmentCap, setInvestmentCap] = useState("");

  // In production this derives from a real-time market clock.
  // Defaulting to closed so the UI shows a safe initial state.
  const marketOpen = false;

  return (
    <div className="flex h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)] overflow-hidden">

      {/* ── Sidebar 240px fixed ── */}
      <aside
        className="w-[240px] flex-shrink-0 bg-[var(--color-surface-1)] border-r border-[var(--color-border)] flex flex-col"
        aria-label="Primary navigation"
      >
        {/* Logo */}
        <div className="px-[16px] py-[20px] border-b border-[var(--color-border)]">
          <div className="flex items-center gap-[10px]">
            <div
              className="w-[28px] h-[28px] rounded-[4px] bg-[var(--color-accent)] flex items-center justify-center flex-shrink-0"
              aria-hidden="true"
            >
              <span
                className="font-[family-name:var(--font-display)]"
                style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-accent-ink)", lineHeight: 1 }}
              >
                MM
              </span>
            </div>
            <span
              className="font-[family-name:var(--font-display)]"
              style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--color-text-primary)" }}
            >
              Market Mind
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-[8px] py-[12px] flex flex-col gap-[2px]" aria-label="Main">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center px-[12px] py-[8px] rounded-[4px] transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1 ${
                item.active
                  ? "bg-[var(--color-surface-2)] text-[var(--color-accent)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
              }`}
              style={{ fontSize: "var(--text-sm)", fontWeight: item.active ? 500 : 400 }}
              aria-current={item.active ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Controls */}
        <div className="px-[16px] py-[16px] flex flex-col gap-[24px] flex-1 overflow-y-auto">

          {/* Risk Tolerance */}
          <div className="flex flex-col gap-[8px]">
            <span
              className="text-[var(--color-text-muted)] uppercase tracking-widest"
              style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}
            >
              Risk Tolerance
            </span>
            <div className="flex flex-col gap-[2px]" role="group" aria-label="Risk Tolerance">
              {RISK_TIERS.map((tier) => (
                <button
                  key={tier}
                  onClick={() => setRiskTier(tier)}
                  className={`px-[12px] py-[7px] rounded-[4px] text-left transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1 ${
                    riskTier === tier
                      ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]"
                  }`}
                  style={{ fontSize: "var(--text-sm)", fontWeight: riskTier === tier ? 500 : 400 }}
                  aria-pressed={riskTier === tier}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Investment Cap */}
          <div className="flex flex-col gap-[8px]">
            <label
              htmlFor="investment-cap"
              className="text-[var(--color-text-muted)] uppercase tracking-widest"
              style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}
            >
              Investment Cap
            </label>
            <input
              id="investment-cap"
              type="text"
              value={investmentCap}
              onChange={(e) => setInvestmentCap(e.target.value)}
              placeholder="$0.00"
              className="w-full px-[12px] py-[8px] bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[4px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline focus:outline-1 focus:outline-[var(--color-accent)]"
              style={{ fontSize: "var(--text-sm)" }}
            />
            <div className="flex items-center justify-between">
              <span className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-xs)" }}>
                Available Capital
              </span>
              <span className="text-[var(--color-text-secondary)]" style={{ fontSize: "var(--text-xs)" }}>
                $0.00
              </span>
            </div>
          </div>

          {/* Brokerage Status */}
          <div className="flex items-center gap-[8px] px-[12px] py-[8px] bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[4px]">
            <div
              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
              style={{ backgroundColor: "var(--color-alert)" }}
              aria-hidden="true"
            />
            <span className="text-[var(--color-text-secondary)]" style={{ fontSize: "var(--text-xs)" }}>
              Brokerage Required
            </span>
          </div>
        </div>

        {/* Account / Disconnect */}
        <div className="px-[8px] py-[12px] border-t border-[var(--color-border)] flex flex-col gap-[2px]">
          <a
            href="#"
            className="flex items-center px-[12px] py-[8px] rounded-[4px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1"
            style={{ fontSize: "var(--text-sm)" }}
          >
            Account
          </a>
          <button
            className="flex items-center px-[12px] py-[8px] rounded-[4px] text-left hover:bg-[var(--color-surface-2)] transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1"
            style={{ fontSize: "var(--text-sm)", color: "var(--color-loss)" }}
          >
            Disconnect
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header bar */}
        <header className="h-[52px] flex-shrink-0 border-b border-[var(--color-border)] flex items-center justify-between px-[24px]">
          <h1
            className="font-[family-name:var(--font-display)]"
            style={{ fontSize: "var(--text-lg)", fontWeight: 600, color: "var(--color-text-primary)" }}
          >
            Dashboard
          </h1>
          <div className="flex items-center gap-[8px]">
            <div
              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
              style={{ backgroundColor: marketOpen ? "var(--color-gain)" : "var(--color-loss)" }}
              aria-hidden="true"
            />
            <span className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-xs)" }}>
              {marketOpen ? "NASDAQ Open" : "NASDAQ Closed"}
            </span>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-[24px] py-[24px] flex flex-col gap-[32px]">

          {/* Hero Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="grid grid-cols-4 gap-[16px]"
          >
            {(
              [
                { label: "Portfolio Value", value: "$0.00" },
                { label: "Open P&L", value: "$0.00" },
                { label: "Closed P&L", value: "$0.00" },
                { label: "Total Return", value: "0.00%" },
              ] as const
            ).map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut", delay: i * 0.06 }}
                className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px] px-[16px] py-[16px] flex flex-col gap-[8px]"
              >
                <span
                  className="text-[var(--color-text-muted)] uppercase tracking-widest"
                  style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}
                >
                  {metric.label}
                </span>
                <span
                  className="font-[family-name:var(--font-display)] text-[var(--color-text-primary)]"
                  style={{ fontSize: "var(--text-metric)", lineHeight: 1.1, fontWeight: 600 }}
                >
                  {metric.value}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Live Signals */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.18 }}
            aria-labelledby="signals-heading"
          >
            <div className="flex items-center justify-between mb-[16px]">
              <h2
                id="signals-heading"
                className="font-[family-name:var(--font-display)]"
                style={{ fontSize: "var(--text-section-title)", fontWeight: 500, color: "var(--color-text-primary)" }}
              >
                Live Signals
              </h2>
              <div className="flex items-center gap-[8px]" role="group" aria-label="Execution mode">
                <button
                  onClick={() => setExecMode("recommend")}
                  className={`px-[12px] py-[6px] rounded-[6px] border transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1 ${
                    execMode === "recommend"
                      ? "bg-[var(--color-surface-2)] border-[var(--color-accent)] text-[var(--color-accent)]"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)]"
                  }`}
                  style={{ fontSize: "var(--text-sm)", fontWeight: execMode === "recommend" ? 500 : 400 }}
                  aria-pressed={execMode === "recommend"}
                >
                  Recommend only
                </button>
                <button
                  onClick={() => setExecMode("auto")}
                  className={`px-[12px] py-[6px] rounded-[6px] border transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1 ${
                    execMode === "auto"
                      ? "bg-[var(--color-accent)] border-[var(--color-accent)] text-[var(--color-accent-ink)]"
                      : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)]"
                  }`}
                  style={{ fontSize: "var(--text-sm)", fontWeight: execMode === "auto" ? 500 : 400 }}
                  aria-pressed={execMode === "auto"}
                >
                  Auto-trade
                </button>
              </div>
            </div>
            <div className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px] px-[24px] py-[48px] flex items-center justify-center">
              <span className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-sm)" }}>
                Scanning NASDAQ for opportunities.
              </span>
            </div>
          </motion.section>

          {/* Portfolio */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut", delay: 0.28 }}
            aria-labelledby="portfolio-heading"
          >
            <h2
              id="portfolio-heading"
              className="font-[family-name:var(--font-display)] mb-[16px]"
              style={{ fontSize: "var(--text-section-title)", fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              Portfolio
            </h2>
            <div className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[4px] overflow-hidden">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    {PORTFOLIO_HEADERS.map((header) => (
                      <th
                        key={header}
                        scope="col"
                        className="px-[16px] py-[10px] text-left text-[var(--color-text-secondary)] uppercase tracking-widest"
                        style={{ fontSize: "var(--text-xs)", fontWeight: 500 }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td
                      colSpan={PORTFOLIO_HEADERS.length}
                      className="px-[16px] py-[32px] text-[var(--color-text-muted)]"
                      style={{ fontSize: "var(--text-sm)" }}
                    >
                      No active positions.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.section>

          {/* Compliance Disclaimers */}
          <footer className="flex flex-col gap-[4px] pt-[16px] border-t border-[var(--color-border)]">
            <p className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-xs)" }}>
              Market Mind is not a registered investment advisor. All trading involves risk.
            </p>
            <p className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-xs)" }}>
              Past performance does not guarantee future results.
            </p>
            <p className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-xs)" }}>
              System will not exceed your defined investment cap.
            </p>
          </footer>
        </div>
      </main>

      {/* ── Context Panel 320px collapsible ── */}
      <motion.aside
        animate={{ width: contextOpen ? 320 : 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="flex-shrink-0 bg-[var(--color-surface-1)] border-l border-[var(--color-border)] overflow-hidden flex flex-col"
        aria-label="Signal rationale panel"
      >
        <div className="w-[320px] h-full flex flex-col">
          <div className="px-[16px] py-[14px] border-b border-[var(--color-border)] flex items-center justify-between flex-shrink-0">
            <h3
              className="font-[family-name:var(--font-display)]"
              style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              Signal Rationale
            </h3>
            <button
              onClick={() => setContextOpen(false)}
              className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1 rounded-[4px] px-[4px] py-[2px]"
              style={{ fontSize: "var(--text-xs)" }}
              aria-label="Close signal rationale panel"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 px-[16px] py-[24px] flex items-start justify-start">
            <span className="text-[var(--color-text-muted)]" style={{ fontSize: "var(--text-sm)" }}>
              Select a signal to view rationale.
            </span>
          </div>
        </div>
      </motion.aside>

      {/* Reopen context panel */}
      <AnimatePresence>
        {!contextOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setContextOpen(true)}
            className="fixed right-0 top-1/2 -translate-y-1/2 bg-[var(--color-surface-1)] border border-[var(--color-border)] border-r-0 rounded-l-[4px] px-[8px] py-[16px] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors focus:outline focus:outline-2 focus:outline-[var(--color-accent)]"
            style={{ fontSize: "var(--text-xs)" }}
            aria-label="Open signal rationale panel"
          >
            ◀
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}