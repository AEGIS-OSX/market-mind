"use client";

import React from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)] font-[family-name:var(--font-body)] flex flex-col items-center justify-center p-[24px]">
      <div className="max-w-[480px] w-full flex flex-col items-center text-center gap-[48px]">
        {/* Logo / Brand */}
        <div className="flex flex-col items-center gap-[16px]">
          <div className="w-[64px] h-[64px] rounded-full bg-[var(--color-accent)] flex items-center justify-center">
            <span className="text-[var(--color-accent-ink)] text-[32px] font-[family-name:var(--font-display)] font-bold">
              MM
            </span>
          </div>
          <h1 className="text-[var(--text-4xl)] font-[family-name:var(--font-display)] font-semibold text-[var(--color-text-primary)]">
            Market Mind
          </h1>
          <p className="text-[var(--text-base)] text-[var(--color-text-secondary)] max-w-[320px]">
            Autonomous trading agent powered by Alpaca. Set your strategy, define your risk, and let the system execute.
          </p>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col gap-[16px] w-full">
          <button
            onClick={() => router.push("/dashboard")}
            className="h-[48px] w-full bg-[var(--color-accent)] text-[var(--color-accent-ink)] rounded-[var(--radius-button)] font-[600] text-[var(--text-base)] transition-opacity hover:opacity-90 focus:outline focus:outline-2 focus:outline-[var(--color-accent)] focus:outline-offset-2"
          >
            Enter Dashboard
          </button>
          <p className="text-[var(--text-xs)] text-[var(--color-text-muted)]">
            By continuing, you agree to the terms of service.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-[8px] text-[var(--text-xs)] text-[var(--color-text-muted)]">
          <div className="w-[6px] h-[6px] rounded-full bg-[var(--color-gain)]" />
          <span>NASDAQ status data refreshes every 60s</span>
        </div>
      </div>
    </main>
  );
}
