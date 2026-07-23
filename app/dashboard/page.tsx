"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "gain" | "loss";
  loading?: boolean;
}

const Skeleton = () => (
  <div className="animate-pulse space-y-[8px]">
    <div className="h-[12px] w-[96px] bg-[var(--color-surface-3)] rounded-[var(--radius-sm)]" />
    <div className="h-[48px] w-[128px] bg-[var(--color-surface-3)] rounded-[var(--radius-sm)]" />
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
      <div className="p-[24px] bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] h-[104px] flex flex-col justify-center">
        <Skeleton />
      </div>
    );
  }

  const deltaColor =
    deltaType === "gain"
      ? "text-[var(--color-gain)]"
      : "text-[var(--color-loss)]";
  const flashColor =
    deltaType === "loss" ? "var(--color-loss)" : "var(--color-gain)";

  return (
    <div className="p-[24px] bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] hover:bg-[var(--color-surface-2)] transition-colors duration-[var(--duration-fast)]">
      <p className="text-[11px] font-[family-name:var(--font-body)] text-[var(--color-text-secondary)] mb-[8px] uppercase tracking-[0.08em]">
        {label}
      </p>
      <div className="flex items-baseline gap-[8px]">
        <motion.span
          animate={{
            color: isFlashing ? flashColor : "var(--color-text-primary)",
          }}
          transition={{ duration: 0.3 }}
          className="text-[48px] font-[family-name:var(--font-display)] font-[600] leading-[1.1] [font-feature-settings:'tnum']"
        >
          {value}
        </motion.span>
        {delta && (
          <span
            className={`font-[family-name:var(--font-body)] text-[var(--text-base)] font-[400] ${deltaColor}`}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
};

interface PortfolioMetrics {
  portfolioValue: string;
  openPnl: string;
  openPnlDelta: string;
  openPnlType: "gain" | "loss";
  closedPnl: string;
  closedPnlDelta: string;
  closedPnlType: "gain" | "loss";
  totalReturn: string;
  totalReturnDelta: string;
  totalReturnType: "gain" | "loss";
}

const DEFAULT_METRICS: PortfolioMetrics = {
  portfolioValue: "$0.00",
  openPnl: "$0.00",
  openPnlDelta: "+0.00%",
  openPnlType: "gain",
  closedPnl: "$0.00",
  closedPnlDelta: "+0.00%",
  closedPnlType: "gain",
  totalReturn: "0.00%",
  totalReturnDelta: "+0.00%",
  totalReturnType: "gain",
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatPercent(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PortfolioMetrics>(DEFAULT_METRICS);
  const marketOpen = false; // derives from real-time market clock in production

  useEffect(() => {
    const supabase = createClient();

    async function fetchMetrics() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          setLoading(false);
          return;
        }

        const { data: positions } = await supabase
          .from("positions")
          .select("*")
          .eq("user_id", user.id);

        const { data: trades } = await supabase
          .from("trades")
          .select("*")
          .eq("user_id", user.id);

        const positionList = positions || [];
        const tradeList = trades || [];

        let portfolioValue = 0;
        let openPnl = 0;

        for (const pos of positionList) {
          const currentPrice = pos.current_price || pos.avg_cost || 0;
          const marketValue = pos.quantity * currentPrice;
          const costBasis = pos.quantity * (pos.avg_cost || 0);
          portfolioValue += marketValue;
          openPnl += marketValue - costBasis;
        }

        let closedPnl = 0;
        for (const trade of tradeList) {
          closedPnl += trade.realized_pnl || 0;
        }

        const totalReturn = portfolioValue > 0
          ? ((openPnl + closedPnl) / Math.max(portfolioValue - openPnl, 1)) * 100
          : 0;

        setMetrics({
          portfolioValue: formatCurrency(portfolioValue),
          openPnl: formatCurrency(Math.abs(openPnl)),
          openPnlDelta: formatPercent(
            portfolioValue > 0 ? (openPnl / portfolioValue) * 100 : 0
          ),
          openPnlType: openPnl >= 0 ? "gain" : "loss",
          closedPnl: formatCurrency(Math.abs(closedPnl)),
          closedPnlDelta: formatPercent(closedPnl >= 0 ? closedPnl : -closedPnl),
          closedPnlType: closedPnl >= 0 ? "gain" : "loss",
          totalReturn: formatPercent(totalReturn),
          totalReturnDelta: formatPercent(totalReturn),
          totalReturnType: totalReturn >= 0 ? "gain" : "loss",
        });
      } catch {
        // show default zeroed metrics on error
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      {/* Page header */}
      <header className="flex items-center justify-between h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Dashboard
        </h1>
        <div className="flex items-center gap-[8px]">
          <span
            className="w-[6px] h-[6px] rounded-full"
            style={{
              backgroundColor: marketOpen
                ? "var(--color-gain)"
                : "var(--color-text-muted)",
            }}
          />
          <span className="font-[family-name:var(--font-body)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
            {marketOpen ? "NASDAQ Open" : "NASDAQ Closed"}
          </span>
        </div>
      </header>

      {/* Metric cards */}
      <section className="p-[var(--space-3)] grid grid-cols-2 gap-[var(--space-2)] xl:grid-cols-4">
        <MetricCard
          label="Portfolio Value"
          value={metrics.portfolioValue}
          loading={loading}
        />
        <MetricCard
          label="Open P&L"
          value={metrics.openPnl}
          delta={metrics.openPnlDelta}
          deltaType={metrics.openPnlType}
          loading={loading}
        />
        <MetricCard
          label="Closed P&L"
          value={metrics.closedPnl}
          delta={metrics.closedPnlDelta}
          deltaType={metrics.closedPnlType}
          loading={loading}
        />
        <MetricCard
          label="Total Return"
          value={metrics.totalReturn}
          delta={metrics.totalReturnDelta}
          deltaType={metrics.totalReturnType}
          loading={loading}
        />
      </section>

      {/* Disclaimer */}
      <footer className="mt-auto px-[var(--space-3)] py-[var(--space-2)] border-t border-[var(--color-border)]">
        <p className="font-[family-name:var(--font-body)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
          Market Mind is not a registered investment advisor. All trading involves risk. Past performance does not guarantee future results.
        </p>
      </footer>
    </main>
  );
}