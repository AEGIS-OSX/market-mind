"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

// Logged-out landing page. The old version here was a full static dashboard
// mock with hardcoded $0.00 metrics that read as live data (audit defect K).
// A logged-out page must not display figures that look like live metrics, so
// this page shows NO numbers at all — the only dynamic element is the real
// market session state from /api/market/clock (public, unpriced).

interface Clock {
  open: boolean;
  label: string;
}

const FEATURES = [
  {
    title: "Real market data",
    body: "Live NASDAQ quotes and daily history from real public feeds. Every price on screen shows its source and as-of timestamp.",
  },
  {
    title: "Transparent signals",
    body: "One stated rule — SMA 20/50 crossover on daily closes — computed from fetched bars. The math is shown next to every signal. No opaque scores.",
  },
  {
    title: "Simulated portfolio",
    body: "Orders fill at the real last price into a simulated account. Real market prices, simulated funds — always labelled, never implied to be real money.",
  },
];

export default function LandingPage() {
  const [clock, setClock] = useState<Clock | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/market/clock")
      .then((r) => r.json())
      .then((c) => mounted && setClock(c))
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-[var(--space-3)] h-[64px] border-b border-[var(--color-border)]">
        <div className="flex items-center gap-[10px]">
          <div
            className="w-[28px] h-[28px] flex items-center justify-center rounded-[var(--radius-sm)]"
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
        <div className="flex items-center gap-[16px]">
          {clock && (
            <span className="hidden sm:flex items-center gap-[8px]">
              <span
                className="w-[6px] h-[6px] rounded-full"
                style={{ backgroundColor: clock.open ? "var(--color-gain)" : "var(--color-text-muted)" }}
              />
              <span className="font-[family-name:var(--font-body)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                {clock.label}
              </span>
            </span>
          )}
          <Link
            href="/login"
            className="px-[16px] py-[8px] text-[var(--text-sm)] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-start px-[var(--space-3)] pt-[var(--space-6)] pb-[var(--space-5)] max-w-[860px]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-4xl)] font-[600] text-[var(--color-text-primary)] leading-[1.15]">
          A trading terminal that never invents a number.
        </h1>
        <p className="mt-[var(--space-2)] font-[family-name:var(--font-body)] text-[var(--text-lg)] text-[var(--color-text-secondary)] leading-[1.6]">
          Market Mind watches NASDAQ with real market data, computes transparent
          signals from a stated rule, and manages a simulated portfolio filled at
          real prices. Every figure carries its source and timestamp — or it
          isn&apos;t shown.
        </p>
        <div className="mt-[var(--space-3)] flex gap-[12px]">
          <Link
            href="/signup"
            className="px-[20px] py-[10px] text-[var(--text-base)] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="px-[20px] py-[10px] text-[var(--text-base)] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] bg-[var(--color-surface-2)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-1)] transition-colors border border-[var(--color-border)]"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-[var(--space-3)] pb-[var(--space-6)] grid gap-[var(--space-2)] md:grid-cols-3 max-w-[1100px]">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] p-[20px]"
          >
            <h2 className="font-[family-name:var(--font-display)] text-[16px] font-[600] text-[var(--color-text-primary)] mb-[8px]">
              {f.title}
            </h2>
            <p className="font-[family-name:var(--font-body)] text-[13px] text-[var(--color-text-secondary)] leading-[1.6]">
              {f.body}
            </p>
          </div>
        ))}
      </section>

      {/* Disclaimer */}
      <footer className="mt-auto px-[var(--space-3)] py-[var(--space-2)] border-t border-[var(--color-border)]">
        <p className="font-[family-name:var(--font-body)] text-[var(--text-xs)] text-[var(--color-text-muted)] leading-[1.6]">
          Market Mind is not a registered investment advisor. All trading involves
          risk. Past performance does not guarantee future results. Portfolios on
          Market Mind are simulated: market prices are real, funds are not.
        </p>
      </footer>
    </main>
  );
}
