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
        <div className="flex items-center gap-[10px]">
          {/* MM logo mark: 28x28, accent bg, accent-ink text */}
          <div
            className="w-[28px] h-[28px] flex items-center justify-center flex-shrink-0 rounded-[var(--radius-sm)]"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            <span
              className="font-[family-name:var(--font-display)] text-[11px] font-[700] leading-none select-none"
              style={{ color: "var(--color-accent-ink)" }}
            >
              MM
            </span>
          </div>
          <span className="font-[family-name:var(--font-display)] text-[16px] font-[600] text-[var(--color-text-primary)]">
            Market Mind
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav aria-label="Main navigation" className="flex flex-col pt-[8px]">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center px-[16px] py-[10px] font-[family-name:var(--font-body)] text-[var(--text-sm)] transition-colors
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
                className={`flex-1 py-[6px] text-[11px] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] transition-colors ${
                  risk === tier
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
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
            title="The maximum dollar amount Market Mind is authorized to manage."
          >
            Investment Cap
          </label>
          <input
            id="investment-cap"
            type="text"
            inputMode="decimal"
            value={investmentCap}
            onChange={(e) => setInvestmentCap(e.target.value)}
            placeholder="$0.00"
            className="w-full bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[var(--radius-button)] px-[10px] py-[6px] text-[var(--text-sm)] font-[family-name:var(--font-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
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
          <span className="text-[11px] font-[family-name:var(--font-body)] text-[var(--color-text-secondary)]">
            {isConnected ? "Alpaca Connected" : "Brokerage Required"}
          </span>
        </div>

        {/* Sign out: plain form POST so it works without client JS */}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="w-full py-[6px] text-[11px] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}