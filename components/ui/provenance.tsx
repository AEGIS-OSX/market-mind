"use client";

import React from "react";

// Renders the provenance every displayed price must carry: source, as-of
// time (ET), and freshness. G in the build spec: non-negotiable.

function fmtEt(iso: string | null | undefined): string {
  if (!iso) return "time unknown";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "time unknown";
  const time = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${time} ET`;
}

const FRESHNESS_LABEL: Record<string, string> = {
  live: "live",
  delayed: "delayed up to 15 min",
  eod: "official close",
  stale: "STALE — feed unavailable",
};

export function Provenance({
  source,
  asOf,
  freshness,
  className = "",
}: {
  source: string | null | undefined;
  asOf: string | null | undefined;
  freshness?: string | null;
  className?: string;
}) {
  const stale = freshness === "stale";
  return (
    <span
      className={`font-[family-name:var(--font-body)] text-[11px] ${
        stale ? "text-[var(--color-alert)]" : "text-[var(--color-text-muted)]"
      } ${className}`}
    >
      {source || "source unknown"} · {fmtEt(asOf)}
      {freshness ? ` · ${FRESHNESS_LABEL[freshness] || freshness}` : ""}
    </span>
  );
}

export function fmtMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
