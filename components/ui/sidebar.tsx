"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Signals", href: "/dashboard/signals" },
  { name: "Portfolio", href: "/dashboard/portfolio" },
  { name: "Trade History", href: "/dashboard/history" },
  { name: "Settings", href: "/dashboard/settings" },
];

const RISK_TIERS = ["Conservative", "Moderate", "Aggressive"];

export default function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [risk, setRisk] = useState("Moderate");
  const [investmentCap, setInvestmentCap] = useState("");
  const [isConnected] = useState(true); // Placeholder state

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Top section — Logo/Brand */}
      <div className="p-[24px_16px_16px]">
        <span className="font-[family-name:var(--font-display)] text-[16px] font-[600] text-[var(--color-accent)]">
          Market Mind
        </span>
      </div>

      {/* Navigation links */}
      <nav aria-label="Main navigation" className="flex flex-col">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center p-[10px_16px] font-[family-name:var(--font-body)] text-[14px] font-[400] transition-colors
                ${isActive 
                  ? "bg-[var(--color-surface-2)] text-[var(--color-accent)] border-l-[2px] border-l-[var(--color-accent)]" 
                  : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                }`}
            >
              <span>{link.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar controls section */}
      <div className="mt-4 p-4 border-t border-[var(--color-border)] flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-[400] text-[var(--color-text-muted)] uppercase tracking-[0.08em]">
            Risk Tolerance
          </label>
          <div className="flex gap-1" title="Defines the volatility and position sizing for automated trades." role="tooltip">
            {RISK_TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => setRisk(tier)}
                className={`flex-1 py-2 text-[12px] font-[500] rounded-[var(--radius-button)] transition-colors
                  ${risk === tier
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                    : "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  }`}
              >
                {tier}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-[11px] font-[400] text-[var(--color-text-muted)] uppercase tracking-[0.08em]">
            Investment Cap
          </label>
          <input
            type="text"
            inputMode="decimal"
            placeholder="$0.00"
            value={investmentCap}
            onChange={(e) => setInvestmentCap(e.target.value)}
            className="h-[44px] w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[var(--radius-button)] text-[var(--color-text-primary)] font-[family-name:var(--font-body)] text-[14px] p-[8px_12px] focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-1"
          />
          <div className="min-h-[1lh]">
            {/* Helper text slot */}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`w-[6px] h-[6px] rounded-full ${isConnected ? "bg-[var(--color-gain)]" : "bg-[var(--color-alert)]"}`} />
          <span className={`text-[13px] font-[400] ${isConnected ? "text-[var(--color-gain)]" : "text-[var(--color-alert)]"}`}>
            {isConnected ? "Alpaca Connected" : "Brokerage Required"}
          </span>
        </div>
      </div>

      {/* Bottom section */}
      <div className="mt-auto p-4 border-t border-[var(--color-border)] flex flex-col gap-2">
        <p className="text-[11px] text-[var(--color-text-muted)] font-[family-name:var(--font-body)]">
          Market Mind is not a registered investment advisor. All trading involves risk.
        </p>
        <p className="text-[11px] text-[var(--color-text-muted)] font-[family-name:var(--font-body)]">
          Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-[48px] bg-[var(--color-surface-1)] border-b border-[var(--color-border)] flex items-center px-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Open navigation"
          aria-expanded={isOpen}
          className="p-2 text-[var(--color-text-primary)]"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 5H17M3 10H17M3 15H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
        <span className="ml-2 font-[family-name:var(--font-display)] text-[14px] font-[600] text-[var(--color-accent)]">
          Market Mind
        </span>
      </header>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="md:hidden fixed inset-0 bg-[color-mix(in_srgb,var(--color-canvas)_80%,transparent)] z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar / Drawer */}
      <aside
        className={`
          fixed md:sticky top-0 left-0 z-50
          w-[240px] h-screen bg-[var(--color-surface-1)] border-r border-[var(--color-border)]
          transition-transform duration-200 ease-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
          overflow-y-auto
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
