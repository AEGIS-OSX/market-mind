"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

/**
 * DESIGN TOKENS REFERENCE (from globals.css):
 * --color-canvas: #0D0F14
 * --color-surface-1: #141720
 * --color-surface-2: #1C2030
 * --color-surface-3: #10121A
 * --color-border: #252A38
 * --color-accent: #00C9A7
 * --color-accent-ink: #0D0F14
 * --color-gain: #22C55E
 * --color-loss: #EF4444
 * --color-text-primary: #F1F5F9
 * --color-text-secondary: #94A3B8
 * --color-text-muted: #6B7280
 * --font-display: Söhne
 * --font-body: Berkeley Mono
 */

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "gain" | "loss";
  loading?: boolean;
}

const Skeleton = () => (
  <div className="animate-pulse space-y-2">
    <div className="h-3 w-24 bg-[var(--color-surface-3)] rounded-[var(--radius-sm)]" />
    <div className="h-8 w-32 bg-[var(--color-surface-3)] rounded-[var(--radius-sm)]" />
  </div>
);

const MetricCard = ({ label, value, delta, deltaType, loading }: MetricCardProps) => {
  const [isFlashing, setIsFlashing] = useState(false);
  const [prevValue, setPrevValue] = useState(value);

  useEffect(() => {
    if (value !== prevValue) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), 300);
      setPrevValue(value);
      return () => clearTimeout(timer);
    }
  }, [value, prevValue]);

  if (loading) {
    return (
      <div className="p-6 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] h-[104px] flex flex-col justify-center">
        <Skeleton />
      </div>
    );
  }

  const deltaColor = deltaType === "gain" ? "text-[var(--color-gain)]" : "text-[var(--color-loss)]";
  const flashColor = deltaType === "loss" ? "var(--color-loss)" : "var(--color-gain)";

  return (
    <div className="p-6 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] hover:bg-[var(--color-surface-2)] transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]">
      <p className="text-[13px] font-[family-name:var(--font-body)] text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <motion.span
          animate={{
            color: isFlashing ? flashColor : "var(--color-text-primary)",
          }}
          transition={{ duration: 0.3 }}
          className="text-[48px] font-[family-name:var(--font-display)] font-semibold leading-[1.1]"
        >
          {value}
        </motion.span>
        {delta && (
          <span className={`text-[13px] font-[family-name:var(--font-body)] ${deltaColor}`}>
            {delta}
          </span>
        )}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [executionMode, setExecutionMode] = useState<"auto" | "recommend" | null>(null);
  const [marketOpen, setMarketOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch settings from server on mount
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/user/settings");
        if (!response.ok) {
          throw new Error("Failed to load settings");
        }
        const data = await response.json();
        setExecutionMode(data.execution_mode);
      } catch {
        setError("Failed to load execution mode. Please refresh the page.");
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  async function handleModeChange(newMode: "auto" | "recommend") {
    if (isUpdating || executionMode === null) return;
    if (executionMode === newMode) return;

    const previousMode = executionMode;
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ execution_mode: newMode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update execution mode");
      }

      const data = await response.json();
      setExecutionMode(data.execution_mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update execution mode");
      setExecutionMode(previousMode);
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col min-h-screen bg-[var(--color-canvas)]">
      {/* Top Bar */}
      <header className="h-12 border-b border-[var(--color-border)] px-6 flex items-center justify-between shrink-0">
        <h1 className="text-[16px] font-[family-name:var(--font-display)] font-medium text-[var(--color-text-primary)]">
          Dashboard
        </h1>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface-3)] border border-[var(--color-border)]">
          <div 
            className={`w-2 h-2 rounded-full ${marketOpen ? "bg-[var(--color-gain)]" : "bg-[var(--color-text-muted)]"}`} 
          />
          <span className={`text-[13px] font-[family-name:var(--font-body)] ${marketOpen ? "text-[var(--color-gain)]" : "text-[var(--color-text-muted)]"}`}>
            {marketOpen ? "NASDAQ Open" : "NASDAQ Closed"}
          </span>
        </div>
      </header>

      {/* Metrics Grid */}
      <section className="p-6 grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Portfolio Value"
          value="$24,831.50"
          loading={isLoading}
        />
        <MetricCard
          label="Open P&L"
          value="+$312.40"
          delta="+1.27%"
          deltaType="gain"
          loading={isLoading}
        />
        <MetricCard
          label="Closed P&L"
          value="+$1,204.80"
          delta="+4.85%"
          deltaType="gain"
          loading={isLoading}
        />
        <MetricCard
          label="Total Return"
          value="+5.24%"
          deltaType="gain"
          loading={isLoading}
        />
      </section>

      {/* Controls Section */}
      <section className="px-6 pb-6 space-y-4">
        {error && (
          <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--color-loss)]/10 border border-[var(--color-loss)]/20 text-[var(--color-loss)] text-[13px] font-[family-name:var(--font-body)]">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-[family-name:var(--font-body)] text-[var(--color-text-secondary)]">
            Execution Mode
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => handleModeChange("auto")}
              disabled={isLoading || isUpdating}
              className={`h-9 px-4 rounded-[var(--radius-button)] text-[13px] font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-canvas)] disabled:opacity-50 disabled:cursor-not-allowed ${
                executionMode === "auto"
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Auto-trade
            </button>
            <button
              onClick={() => handleModeChange("recommend")}
              disabled={isLoading || isUpdating}
              className={`h-9 px-4 rounded-[var(--radius-button)] text-[13px] font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:ring-offset-2 focus:ring-offset-[var(--color-canvas)] disabled:opacity-50 disabled:cursor-not-allowed ${
                executionMode === "recommend"
                  ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                  : "bg-[var(--color-surface-3)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              Recommend only
            </button>
          </div>
        </div>

        <p className="text-[11px] font-[family-name:var(--font-body)] text-[var(--color-text-muted)]">
          System will not exceed your defined investment cap.
        </p>
      </section>
    </main>
  );
}
