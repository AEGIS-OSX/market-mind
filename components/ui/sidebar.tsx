"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const [risk, setRisk] = useState("Moderate");
  const [investmentCap, setInvestmentCap] = useState("");
  const [isConnected] = useState(true);

  return (
    <aside
      className="sticky top-0 h-screen w-[240px] flex-shrink-0 bg-[var(--color-surface-1)] border-r border-[var(--color-border)] flex flex-col overflow-y-auto"
      aria-label="Primary navigation"
    >
      {/* Logo */}
      <div className="px-[16px] py-[20px] border-b border-[var(--color-border)]">
        <span
          className="font-[family-name:var(--font-display)] text-[16px] font-[600] text-[var(--color-text-primary)]"
        >
          Market Mind
        </span>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex flex-col pt-[8px]">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-[16px] py-[10px] font-[family-name:var(--font-body)] text-[14px] transition-colors
                ${
                  isActive
                    ? "bg-[var(--color-surface-2)] text-[var(--color-accent)] font-[500]"
                    : "text-[var(--color-text-secondary)] font-[400] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
                }`}
            >
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Controls */}
      <div className="mt-auto p-[16px] border-t border-[var(--color-border)] flex flex-col gap-[16px]">
        {/* Risk Tolerance */}
        <div className="flex flex-col gap-[8px]">
          <label className="text-[11px] font-[400] text-[var(--color-text-muted)] uppercase tracking-[0.08em]">
            Risk Tolerance
          </label>
          <div
            className="flex gap-[4px]"
            title="Defines the volatility and position sizing for automated trades."
          >
            {RISK_TIERS.map((tier) => (
              <button
                key={tier}
                onClick={() => setRisk(tier)}
                className={`flex-1 h-[28px] text-[11px] font-[family-name:var(--font-body)] rounded-[var(--radius-button)] transition-colors ${
                  risk === tier
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-[500]"
                    : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                }`}
              >
                {tier.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Investment Cap */}
        <div className="flex flex-col gap-[8px]">
          <label
            htmlFor="investment-cap"
            className="text-[11px] font-[400] text-[var(--color-text-muted)] uppercase tracking-[0.08em]"
          >
            Investment Cap
          </label>
          <input
            id="investment-cap"
            type="number"
            min="0"
            value={investmentCap}
            onChange={(e) => setInvestmentCap(e.target.value)}
            placeholder="$0.00"
            title="The maximum dollar amount Market Mind is authorized to manage."
            className="h-[36px] px-[10px] bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[var(--radius-button)] text-[13px] font-[family-name:var(--font-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors [font-feature-settings:'tnum']"
          />
        </div>

        {/* Brokerage Status */}
        <div className="flex items-center gap-[8px]">
          <span
            className="w-[6px] h-[6px] rounded-full flex-shrink-0"
            style={{
              backgroundColor: isConnected
                ? "var(--color-gain)"
                : "var(--color-loss)",
            }}
          />
          <span className="text-[12px] font-[family-name:var(--font-body)] text-[var(--color-text-secondary)]">
            {isConnected ? "Alpaca Connected" : "Brokerage Required"}
          </span>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-[16px] pb-[16px]">
        <p className="text-[11px] font-[family-name:var(--font-body)] text-[var(--color-text-muted)] leading-[1.5]">
          Market Mind is not a registered investment advisor. All trading involves risk.
        </p>
      </div>
    </aside>
  );
}