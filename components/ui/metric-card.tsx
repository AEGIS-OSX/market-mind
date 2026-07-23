import React from "react";
import { Skeleton } from "./skeleton";

interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaType?: "gain" | "loss" | "neutral";
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  delta,
  deltaType = "neutral",
  loading = false,
}: MetricCardProps) {
  const deltaColor =
    deltaType === "gain"
      ? "text-[var(--color-gain)]"
      : deltaType === "loss"
      ? "text-[var(--color-loss)]"
      : "text-[var(--color-text-muted)]";

  return (
    <div className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] p-4 md:p-5">
      <div className="font-[family-name:var(--font-body)] text-[11px] font-normal text-[var(--color-text-secondary)] uppercase tracking-[0.08em] mb-2">
        {label}
      </div>
      <div className="flex items-baseline gap-3">
        {loading ? (
          <Skeleton width="120px" height="48px" />
        ) : (
          <span className="font-[family-name:var(--font-display)] text-[48px] font-[600] text-[var(--color-text-primary)] leading-[1.1] [font-feature-settings:'tnum']">
            {value}
          </span>
        )}
        {delta && !loading && (
          <span
            className={`font-[family-name:var(--font-body)] text-[14px] font-normal ${deltaColor}`}
          >
            {delta}
          </span>
        )}
      </div>
    </div>
  );
}