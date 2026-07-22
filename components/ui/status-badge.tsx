import React from "react";

type BadgeVariant =
  | "buy"
  | "sell"
  | "hold"
  | "filled"
  | "pending"
  | "cancelled"
  | "rejected"
  | "gain"
  | "loss"
  | "alert"
  | "connected"
  | "disconnected";

interface StatusBadgeProps {
  variant: BadgeVariant;
  label: string;
}

const variantColorMap: Record<BadgeVariant, string> = {
  buy: "var(--color-gain)",
  filled: "var(--color-gain)",
  gain: "var(--color-gain)",
  connected: "var(--color-gain)",
  sell: "var(--color-loss)",
  rejected: "var(--color-loss)",
  loss: "var(--color-loss)",
  disconnected: "var(--color-loss)",
  hold: "var(--color-alert)",
  pending: "var(--color-alert)",
  alert: "var(--color-alert)",
  cancelled: "var(--color-text-muted)",
};

export function StatusBadge({ variant, label }: StatusBadgeProps) {
  const color = variantColorMap[variant];

  return (
    <span
      aria-label={label}
      className="inline-flex items-center gap-2 px-2 py-[2px] font-[family-name:var(--font-body)] text-[11px] font-medium uppercase tracking-[0.08em] rounded-[var(--radius-button)]"
      style={{ color }}
    >
      <span
        className="w-[5px] h-[5px] rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
