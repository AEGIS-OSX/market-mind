"use client";

import React, { useState } from "react";

// Manual trade ticket for the simulated portfolio. Every fill happens
// server-side at the real last price; this form never carries a price.

export function TradeTicket({ onExecuted }: { onExecuted?: () => void }) {
  const [symbol, setSymbol] = useState("");
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const submit = async (approved: boolean) => {
    const qty = Number(quantity);
    if (!symbol.trim() || !Number.isFinite(qty) || qty <= 0) {
      setMessage({ kind: "err", text: "Action failed. Try again. (symbol and a positive quantity are required)" });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/trade/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: symbol.trim().toUpperCase(), side, quantity: qty, approved }),
      });
      const d = await res.json();
      if (!res.ok) {
        setMessage({ kind: "err", text: `Action failed. Try again. (${d.error})` });
      } else if (d.placed) {
        setMessage({ kind: "ok", text: d.message });
        setQuantity("");
        onExecuted?.();
      } else {
        // recommend-only: surface the recommendation and offer the one tap
        setMessage({ kind: "ok", text: d.message });
      }
    } catch {
      setMessage({ kind: "err", text: "Action failed. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)] p-[16px] flex flex-col gap-[12px]">
      <div className="flex items-baseline justify-between">
        <h2 className="font-[family-name:var(--font-display)] text-[16px] font-[600] text-[var(--color-text-primary)]">
          Place Order
        </h2>
        <span className="text-[11px] font-[family-name:var(--font-body)] text-[var(--color-text-muted)]">
          Simulated portfolio — real market prices, simulated funds.
        </span>
      </div>
      <div className="flex gap-[8px] items-center flex-wrap">
        <input
          aria-label="Ticker symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Ticker (e.g. AAPL)"
          className="w-[140px] bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[var(--radius-button)] px-[10px] py-[8px] text-[var(--text-sm)] font-[family-name:var(--font-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
        />
        <div className="flex gap-[4px]">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={`px-[14px] py-[8px] text-[11px] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] uppercase tracking-[0.06em] transition-colors ${
                side === s
                  ? s === "buy"
                    ? "bg-[var(--color-gain)] text-[var(--color-accent-ink)]"
                    : "bg-[var(--color-loss)] text-[var(--color-text-primary)]"
                  : "bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <input
          aria-label="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          inputMode="decimal"
          placeholder="Qty"
          className="w-[90px] bg-[var(--color-surface-3)] border border-[var(--color-border)] rounded-[var(--radius-button)] px-[10px] py-[8px] text-[var(--text-sm)] font-[family-name:var(--font-body)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)]"
        />
        <button
          onClick={() => submit(true)}
          disabled={busy}
          className="px-[16px] py-[8px] text-[var(--text-sm)] font-[family-name:var(--font-body)] font-[500] rounded-[var(--radius-button)] disabled:opacity-60 transition-opacity"
          style={{ backgroundColor: "var(--color-accent)", color: "var(--color-accent-ink)" }}
        >
          {busy ? "Submitting..." : "Submit (simulated)"}
        </button>
      </div>
      {message && (
        <p
          role={message.kind === "err" ? "alert" : "status"}
          className="text-[13px] font-[family-name:var(--font-body)] leading-[1.5]"
          style={{ color: message.kind === "err" ? "var(--color-loss)" : "var(--color-text-secondary)" }}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
