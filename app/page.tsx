"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Ease curve matching var(--ease-out): cubic-bezier(0.16, 1, 0.3, 1)
// FIX: All motion transitions now use this curve instead of default linear.
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

// FIX(tabs): nav items no longer carry a hardcoded `active` flag. The active
// tab is tracked in `activeNav` state and each item declares the view it opens.
const NAV_ITEMS = [
  { label: "Dashboard" },
  { label: "Signals" },
  { label: "Portfolio" },
  { label: "Trade History" },
  { label: "Settings" },
] as const;

type NavLabel = (typeof NAV_ITEMS)[number]["label"];

const RISK_TIERS = ["Conservative", "Moderate", "Aggressive"] as const;
type RiskTier = (typeof RISK_TIERS)[number];

// Section 5 — Portfolio & Holdings Table headers (unchanged from spec)
const PORTFOLIO_HEADERS = ["Ticker", "Position", "Avg Price", "Current Price", "P&L", "Value"];

// FIX: Section 6 — Trade History headers now include "Status" and "Rationale" per Quinn's spec.
const HISTORY_HEADERS = ["Date", "Ticker", "Action", "Quantity", "Price", "Status", "Rationale"];

export default function Home() {
  const [riskTier, setRiskTier] = useState<RiskTier>("Moderate");
  const [execMode, setExecMode] = useState<"auto" | "recommend">("recommend");
  const [contextOpen, setContextOpen] = useState(true);
  // FIX: Default to $10,000.00 instead of empty string so trading is not blocked.
  const [investmentCap, setInvestmentCap] = useState("10000");
  // Brokerage connection state — drives "Alpaca Connected" / "Brokerage Required" copy.
  const [brokerageConnected, setBrokerageConnected] = useState(false);
  // FIX(tabs): active tab state. Drives nav highlight, header title, and which
  // content view renders. Replaces the old static href="#" anchors that only
  // appended /# to the URL and never changed the view.
  const [activeNav, setActiveNav] = useState<NavLabel>("Dashboard");

  // In production this derives from a real-time market clock.
  // Defaulting to closed so the UI shows a safe initial state.
  const marketOpen = false;

  // Which primary sections are visible for the current tab. Dashboard shows the
  // full overview; the other tabs scope down to their own view.
  const showMetrics = activeNav === "Dashboard";
  const showSignals = activeNav === "Dashboard" || activeNav === "Signals";
  const showPortfolio = activeNav === "Dashboard" || activeNav === "Portfolio";
  const showHistory = activeNav === "Dashboard" || activeNav === "Trade History";
  const showSettings = activeNav === "Settings";

  return (
    // FIX: Pure flex-row layout. Sidebar is a flex child, NOT absolute/fixed positioned.
    // min-w-0 on main prevents flex overflow from clipping the hero metric card.
    <div className="flex flex-row h-screen overflow-hidden bg-[var(--color-canvas)] text-[var(--color-text-primary)]">

      {/* ── Sidebar 240px fixed-width flex child ── */}
      <aside
        className="w-[240px] flex-shrink-0 bg-[var(--color-surface-1)] border-r border-[var(--color-border)] flex flex-col"
        aria-label="Primary navigation"
      >
        {/* Logo */}
        <div className="px-[16px] py-[20px] border-b border-[var(--color-border)]">
          <div className="flex items-center gap-[10px]">
            <div
              className="w-[28px] h-[28px] flex items-center justify-center flex-shrink-0"
              style={{ borderRadius: "var(--radius-panel)", backgroundColor: "var(--color-accent)" }}
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
        {/* FIX(tabs): buttons, not <a href="#">. onClick sets activeNav so the view
            switches with no page reload and no /# appended to the URL. aria-current
            marks the active tab for assistive tech; buttons are keyboard-reachable
            and fire on Enter/Space natively. */}
        <nav className="px-[8px] py-[12px] flex flex-col gap-[2px]" aria-label="Main">
          {NAV_ITEMS.map((item) => {
            const isActive = activeNav === item.label;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => setActiveNav(item.label)}
                aria-current={isActive ? "page" : undefined}
                className="flex items-center px-[12px] py-[8px] transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                style={{
                  borderRadius: "var(--radius-panel)",
                  fontSize: "var(--text-sm)",
                  fontWeight: isActive ? 500 : 400,
                  color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                  backgroundColor: isActive ? "rgba(0, 201, 167, 0.08)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Divider */}
        <div className="mx-[16px] border-t border-[var(--color-border)]" />

        {/* Risk Tolerance */}
        <div className="px-[16px] py-[16px] flex flex-col gap-[8px]">
          <label
            className="font-[family-name:var(--font-body)]"
            style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            Risk Tolerance
          </label>
          <div className="flex flex-col gap-[4px]">
            {RISK_TIERS.map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setRiskTier(tier)}
                // FIX: border-radius uses var(--radius-button) = 6px, not 4px.
                style={{
                  borderRadius: "var(--radius-button)",
                  fontSize: "var(--text-sm)",
                  fontWeight: riskTier === tier ? 500 : 400,
                  color: riskTier === tier ? "var(--color-accent-ink)" : "var(--color-text-secondary)",
                  backgroundColor: riskTier === tier ? "var(--color-accent)" : "transparent",
                  border: riskTier === tier ? "none" : "1px solid var(--color-border)",
                  padding: "6px 12px",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: `background-color var(--duration-fast)`,
                }}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        {/* Investment Cap */}
        <div className="px-[16px] pb-[16px] flex flex-col gap-[8px]">
          <label
            htmlFor="investment-cap"
            className="font-[family-name:var(--font-body)]"
            style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}
          >
            Investment Cap
          </label>
          <div className="relative">
            <span
              className="absolute left-[10px] top-1/2 -translate-y-1/2 font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-sm)", color: "var(--color-text-secondary)" }}
              aria-hidden="true"
            >
              $
            </span>
            <input
              id="investment-cap"
              type="number"
              min="0"
              step="100"
              value={investmentCap}
              onChange={(e) => setInvestmentCap(e.target.value)}
              placeholder="0.00"
              className="w-full pl-[22px] pr-[10px] py-[8px] font-[family-name:var(--font-body)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              style={{
                borderRadius: "var(--radius-panel)",
                fontSize: "var(--text-sm)",
                color: "var(--color-text-primary)",
                backgroundColor: "var(--color-surface-3)",
                border: "1px solid var(--color-border)",
              }}
            />
          </div>
          <p
            className="font-[family-name:var(--font-body)]"
            style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}
          >
            Available Capital
          </p>
        </div>

        {/* Divider */}
        <div className="mx-[16px] border-t border-[var(--color-border)]" />

        {/* FIX: Brokerage Status — "Alpaca Connected" or "Brokerage Required" per Quinn's spec. */}
        <div className="px-[16px] py-[16px]">
          <button
            type="button"
            onClick={() => setBrokerageConnected((v) => !v)}
            className="w-full flex items-center gap-[8px] px-[12px] py-[8px]"
            style={{
              borderRadius: "var(--radius-button)",
              fontSize: "var(--text-sm)",
              fontWeight: 500,
              color: brokerageConnected ? "var(--color-gain)" : "var(--color-alert)",
              backgroundColor: brokerageConnected ? "rgba(34, 197, 94, 0.08)" : "rgba(245, 158, 11, 0.08)",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <span
              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
              style={{ backgroundColor: brokerageConnected ? "var(--color-gain)" : "var(--color-alert)" }}
              aria-hidden="true"
            />
            {brokerageConnected ? "Alpaca Connected" : "Brokerage Required"}
          </button>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* FIX: Market Status — "NASDAQ Open" / "NASDAQ Closed" using marketOpen boolean. */}
        <div className="px-[16px] py-[16px] border-t border-[var(--color-border)]">
          <div className="flex items-center gap-[8px]">
            <span
              className="w-[6px] h-[6px] rounded-full flex-shrink-0"
              style={{ backgroundColor: marketOpen ? "var(--color-gain)" : "var(--color-text-muted)" }}
              aria-hidden="true"
            />
            <span
              className="font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: marketOpen ? "var(--color-gain)" : "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              {marketOpen ? "NASDAQ Open" : "NASDAQ Closed"}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content — flex-1 min-w-0 prevents hero metric from being clipped ── */}
      <main className="flex-1 min-w-0 overflow-auto flex flex-col" aria-label={activeNav}>

        {/* Header bar */}
        <header className="flex items-center justify-between px-[24px] py-[16px] border-b border-[var(--color-border)] flex-shrink-0">
          {/* FIX(tabs): title reflects the active tab instead of a hardcoded label. */}
          <h1
            className="font-[family-name:var(--font-display)]"
            style={{ fontSize: "var(--text-xl)", fontWeight: 500, color: "var(--color-text-primary)" }}
          >
            {activeNav}
          </h1>
          <div className="flex items-center gap-[12px]">
            {/* Execution mode toggle */}
            <div
              className="flex items-center gap-[2px] p-[2px]"
              style={{ borderRadius: "var(--radius-button)", backgroundColor: "var(--color-surface-2)", border: "1px solid var(--color-border)" }}
              role="group"
              aria-label="Execution mode"
            >
              {(["recommend", "auto"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setExecMode(mode)}
                  style={{
                    borderRadius: "calc(var(--radius-button) - 2px)",
                    fontSize: "var(--text-xs)",
                    fontWeight: execMode === mode ? 500 : 400,
                    color: execMode === mode ? "var(--color-accent-ink)" : "var(--color-text-secondary)",
                    backgroundColor: execMode === mode ? "var(--color-accent)" : "transparent",
                    border: "none",
                    padding: "6px 12px",
                    cursor: "pointer",
                    transition: `background-color var(--duration-fast)`,
                  }}
                >
                  {mode === "recommend" ? "Recommend only" : "Auto-trade"}
                </button>
              ))}
            </div>
            <button
              type="button"
              style={{
                borderRadius: "var(--radius-button)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                backgroundColor: "transparent",
                border: "1px solid var(--color-border)",
                padding: "6px 16px",
                cursor: "pointer",
              }}
            >
              Account
            </button>
          </div>
        </header>

        {/* ── Hero Metrics ── */}
        {showMetrics && (
        <motion.section
          className="px-[24px] py-[24px] grid grid-cols-4 gap-[16px] flex-shrink-0"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          // FIX: ease-out cubic-bezier applied to all motion transitions.
          transition={{ duration: 0.4, ease: EASE_OUT }}
          aria-label="Portfolio metrics"
        >
          {/* Portfolio Value — primary metric */}
          <div
            className="col-span-1 flex flex-col gap-[8px] p-[20px]"
            style={{ borderRadius: "var(--radius-panel)", backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
          >
            <span
              className="font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Portfolio Value
            </span>
            {/* FIX: font-weight 600 (Söhne Kräftig) applied to hero metric value. */}
            <span
              className="font-[family-name:var(--font-display)]"
              style={{ fontSize: "var(--text-metric)", fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.1 }}
            >
              $0.00
            </span>
          </div>

          {/* Open P&L */}
          <div
            className="flex flex-col gap-[8px] p-[20px]"
            style={{ borderRadius: "var(--radius-panel)", backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
          >
            <span
              className="font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Open P&amp;L
            </span>
            <span
              className="font-[family-name:var(--font-display)]"
              style={{ fontSize: "var(--text-3xl)", fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.1 }}
            >
              $0.00
            </span>
          </div>

          {/* Closed P&L */}
          <div
            className="flex flex-col gap-[8px] p-[20px]"
            style={{ borderRadius: "var(--radius-panel)", backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
          >
            <span
              className="font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Closed P&amp;L
            </span>
            <span
              className="font-[family-name:var(--font-display)]"
              style={{ fontSize: "var(--text-3xl)", fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.1 }}
            >
              $0.00
            </span>
          </div>

          {/* Total Return */}
          <div
            className="flex flex-col gap-[8px] p-[20px]"
            style={{ borderRadius: "var(--radius-panel)", backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
          >
            <span
              className="font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Total Return
            </span>
            <span
              className="font-[family-name:var(--font-display)]"
              style={{ fontSize: "var(--text-3xl)", fontWeight: 600, color: "var(--color-text-primary)", lineHeight: 1.1 }}
            >
              0.00%
            </span>
          </div>
        </motion.section>
        )}

        {/* ── Live Signals ── */}
        {showSignals && (
        <motion.section
          className="px-[24px] pb-[24px] flex flex-col gap-[12px] flex-shrink-0"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.05 }}
          aria-label="Live signals"
        >
          <div className="flex items-center justify-between">
            <h2
              className="font-[family-name:var(--font-display)]"
              style={{ fontSize: "var(--text-section-title)", fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              Live Signals
            </h2>
            <button
              type="button"
              onClick={() => setContextOpen((v) => !v)}
              style={{
                borderRadius: "var(--radius-button)",
                fontSize: "var(--text-xs)",
                fontWeight: 500,
                color: "var(--color-text-secondary)",
                backgroundColor: "transparent",
                border: "1px solid var(--color-border)",
                padding: "4px 12px",
                cursor: "pointer",
              }}
            >
              {contextOpen ? "Hide Rationale" : "Signal Rationale"}
            </button>
          </div>

          {/* Empty state */}
          <div
            className="flex items-center justify-center py-[48px]"
            style={{ borderRadius: "var(--radius-panel)", backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
          >
            <p
              className="font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-base)", color: "var(--color-text-muted)" }}
            >
              Scanning NASDAQ for opportunities.
            </p>
          </div>
        </motion.section>
        )}

        {/* ── Portfolio & Holdings ── */}
        {showPortfolio && (
        <motion.section
          className="px-[24px] pb-[24px] flex flex-col gap-[12px] flex-shrink-0"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.1 }}
          aria-label="Portfolio holdings"
        >
          <h2
            className="font-[family-name:var(--font-display)]"
            style={{ fontSize: "var(--text-section-title)", fontWeight: 500, color: "var(--color-text-primary)" }}
          >
            Portfolio
          </h2>
          <div
            style={{ borderRadius: "var(--radius-panel)", backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)", overflow: "hidden" }}
          >
            <table className="w-full" role="table">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {PORTFOLIO_HEADERS.map((h) => (
                    <th
                      key={h}
                      className="px-[16px] py-[10px] text-left font-[family-name:var(--font-body)]"
                      style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={PORTFOLIO_HEADERS.length}
                    className="px-[16px] py-[32px] text-center font-[family-name:var(--font-body)]"
                    style={{ fontSize: "var(--text-base)", color: "var(--color-text-muted)" }}
                  >
                    No active positions.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.section>
        )}

        {/* ── Trade History ── */}
        {showHistory && (
        <motion.section
          className="px-[24px] pb-[24px] flex flex-col gap-[12px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.15 }}
          aria-label="Trade history"
        >
          <div className="flex items-center justify-between">
            <h2
              className="font-[family-name:var(--font-display)]"
              style={{ fontSize: "var(--text-section-title)", fontWeight: 500, color: "var(--color-text-primary)" }}
            >
              Trade History
            </h2>
            <div className="flex items-center gap-[8px]">
              <button
                type="button"
                style={{
                  borderRadius: "var(--radius-button)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--color-border)",
                  padding: "4px 12px",
                  cursor: "pointer",
                }}
              >
                View Audit Trail
              </button>
              <button
                type="button"
                style={{
                  borderRadius: "var(--radius-button)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 500,
                  color: "var(--color-text-secondary)",
                  backgroundColor: "transparent",
                  border: "1px solid var(--color-border)",
                  padding: "4px 12px",
                  cursor: "pointer",
                }}
              >
                Export CSV
              </button>
            </div>
          </div>
          {/* FIX: Headers now include "Status" and "Rationale" per Quinn's Section 6 spec. */}
          <div
            style={{ borderRadius: "var(--radius-panel)", backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)", overflow: "hidden" }}
          >
            <table className="w-full" role="table">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  {HISTORY_HEADERS.map((h) => (
                    <th
                      key={h}
                      className="px-[16px] py-[10px] text-left font-[family-name:var(--font-body)]"
                      style={{ fontSize: "var(--text-xs)", fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.06em" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td
                    colSpan={HISTORY_HEADERS.length}
                    className="px-[16px] py-[32px] text-center font-[family-name:var(--font-body)]"
                    style={{ fontSize: "var(--text-base)", color: "var(--color-text-muted)" }}
                  >
                    No trade history.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Compliance disclaimers */}
          <div className="flex flex-col gap-[4px] pt-[8px]">
            <p
              className="font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}
            >
              Market Mind is not a registered investment advisor. All trading involves risk.
            </p>
            <p
              className="font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}
            >
              Past performance does not guarantee future results.
            </p>
            <p
              className="font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}
            >
              System will not exceed your defined investment cap.
            </p>
          </div>
        </motion.section>
        )}

        {/* ── Settings ── */}
        {showSettings && (
        <motion.section
          className="px-[24px] py-[24px] flex flex-col gap-[12px]"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          aria-label="Settings"
        >
          <h2
            className="font-[family-name:var(--font-display)]"
            style={{ fontSize: "var(--text-section-title)", fontWeight: 500, color: "var(--color-text-primary)" }}
          >
            Settings
          </h2>
          <div
            className="flex items-center justify-center py-[48px]"
            style={{ borderRadius: "var(--radius-panel)", backgroundColor: "var(--color-surface-1)", border: "1px solid var(--color-border)" }}
          >
            <p
              className="font-[family-name:var(--font-body)]"
              style={{ fontSize: "var(--text-base)", color: "var(--color-text-muted)" }}
            >
              Account and execution preferences are managed in the sidebar. More settings coming soon.
            </p>
          </div>
        </motion.section>
        )}
      </main>

      {/* ── Context Panel 320px collapsible ── */}
      <AnimatePresence>
        {contextOpen && (
          <motion.aside
            key="context-panel"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            // FIX: ease-out cubic-bezier applied.
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="flex-shrink-0 overflow-hidden border-l border-[var(--color-border)] bg-[var(--color-surface-1)] flex flex-col"
            aria-label="Signal rationale"
          >
            <div className="w-[320px] flex flex-col h-full">
              <div className="px-[16px] py-[16px] border-b border-[var(--color-border)] flex items-center justify-between">
                <h3
                  className="font-[family-name:var(--font-display)]"
                  style={{ fontSize: "var(--text-lg)", fontWeight: 500, color: "var(--color-text-primary)" }}
                >
                  Signal Rationale
                </h3>
                <button
                  type="button"
                  onClick={() => setContextOpen(false)}
                  style={{
                    borderRadius: "var(--radius-button)",
                    fontSize: "var(--text-xs)",
                    color: "var(--color-text-muted)",
                    backgroundColor: "transparent",
                    border: "none",
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                  aria-label="Close signal rationale panel"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center px-[16px]">
                <p
                  className="text-center font-[family-name:var(--font-body)]"
                  style={{ fontSize: "var(--text-rationale)", color: "var(--color-text-muted)", lineHeight: 1.6 }}
                >
                  Scanning NASDAQ for opportunities.
                </p>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}