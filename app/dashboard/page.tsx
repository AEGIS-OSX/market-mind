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
            className={`font-[family-name:var(--font-body)] text-[14px] font-[400] ${deltaColor}`}
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
  closedPnlType: "gain" | "loss";
  totalReturn: string;
  totalReturnType: "gain" | "loss";
}

const EMPTY_METRICS: PortfolioMetrics = {
  portfolioValue: "--",
  openPnl: "--",
  openPnlDelta: "",
  openPnlType: "gain",
  closedPnl: "--",
  closedPnlType: "gain",
  totalReturn: "--",
  totalReturnType: "gain",
};

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatPercent(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PortfolioMetrics>(EMPTY_METRICS);
  const marketOpen = false;

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || cancelled) {
          setLoading(false);
          return;
        }

        const [positionsResult, tradesResult] = await Promise.all([
          supabase
            .from("positions")
            .select("*")
            .eq("user_id", user.id),
          supabase
            .from("trades")
            .select("*")
            .eq("user_id", user.id),
        ]);

        if (cancelled) return;

        const positions = positionsResult.data || [];
        const trades = tradesResult.data || [];

        let totalMarketValue = 0;
        let totalCostBasis = 0;

        for (const pos of positions) {
          const currentPrice = pos.current_price || pos.avg_cost || 0;
          const marketValue = pos.quantity * currentPrice;
          const costBasis = pos.quantity * (pos.avg_cost || 0);
          totalMarketValue += marketValue;
          totalCostBasis += costBasis;
        }

        const openPnlValue = totalMarketValue - totalCostBasis;
        const totalReturnPct =
          totalCostBasis > 0
            ? (openPnlValue / totalCostBasis) * 100
            : 0;

        let closedPnlValue = 0;
        for (const trade of trades) {
          if (trade.realized_pnl != null) {
            closedPnlValue += trade.realized_pnl;
          }
        }

        setMetrics({
          portfolioValue: formatCurrency(totalMarketValue),
          openPnl: formatCurrency(Math.abs(openPnlValue)),
          openPnlDelta: formatPercent(totalReturnPct),
          openPnlType: openPnlValue >= 0 ? "gain" : "loss",
          closedPnl: formatCurrency(Math.abs(closedPnlValue)),
          closedPnlType: closedPnlValue >= 0 ? "gain" : "loss",
          totalReturn: formatPercent(totalReturnPct),
          totalReturnType: totalReturnPct >= 0 ? "gain" : "loss",
        });
      } catch {
        // Fetch failed — show empty metrics, no error banner.
        // The user can navigate to sub-pages for detailed data.
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadMetrics();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-text-primary)]">
      {/* Page header */}
      <header className="flex items-center justify-between px-[24px] h-[64px] border-b border-[var(--color-border)] bg-[var(--color-surface-1)] flex-shrink-0">
        <h1 className="font-[family-name:var(--font-display)] text-[22px] font-[500] text-[var(--color-text-primary)]">
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
          <span className="font-[family-name:var(--font-body)] text-[12px] text-[var(--color-text-secondary)]">
            {marketOpen ? "NASDAQ Open" : "NASDAQ Closed"}
          </span>
        </div>
      </header>

      {/* Metrics grid */}
      <section className="p-[24px]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT }}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-[16px]"
        >
          <MetricCard
            label="Portfolio Value"
            value={metrics.portfolioValue}
            loading={loading}
          />
          <MetricCard
            label="Open P&L"
            value={metrics.openPnl}
            delta={metrics.openPnlDelta || undefined}
            deltaType={metrics.openPnlType}
            loading={loading}
          />
          <MetricCard
            label="Closed P&L"
            value={metrics.closedPnl}
            deltaType={metrics.closedPnlType}
            loading={loading}
          />
          <MetricCard
            label="Total Return"
            value={metrics.totalReturn}
            deltaType={metrics.totalReturnType}
            loading={loading}
          />
        </motion.div>
      </section>

      {/* Disclaimer */}
      <div className="px-[24px] pb-[8px]">
        <p className="font-[family-name:var(--font-body)] text-[11px] text-[var(--color-text-muted)]">
          Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  );
}