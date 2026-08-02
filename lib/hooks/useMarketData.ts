"use client";

import { useEffect, useRef, useState } from "react";

export interface UiQuote {
  symbol: string;
  price: number;
  asOf: string;
  source: string;
  freshness: "live" | "delayed" | "eod" | "stale";
  fetchedAt: string;
}

export interface MarketDataState {
  prices: Record<string, number>;
  quotes: Record<string, UiQuote>;
  /** per-symbol fetch failures (symbol -> reason) */
  failures: Record<string, string>;
  loading: boolean;
  error: string | null;
}

const POLL_MS = 30_000;
// T-009 criterion 7: this exact string on feed failure.
export const FEED_ERROR = "Real-time data feed interrupted. Reconnecting.";

export function useMarketData(symbols: string[]): MarketDataState {
  const [state, setState] = useState<MarketDataState>({
    prices: {},
    quotes: {},
    failures: {},
    loading: true,
    error: null,
  });
  const key = symbols.join(",");
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!key) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const res = await fetch(`/api/market/quotes?symbols=${encodeURIComponent(key)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        if (!mounted.current) return;
        const prices: Record<string, number> = {};
        const quotes: Record<string, UiQuote> = {};
        const failures: Record<string, string> = {};
        for (const [sym, r] of Object.entries<any>(d.quotes || {})) {
          if (r.ok) {
            prices[sym] = r.quote.price;
            quotes[sym] = r.quote;
          } else {
            failures[sym] = r.error;
          }
        }
        setState({ prices, quotes, failures, loading: false, error: null });
      } catch {
        if (!mounted.current) return;
        // Keep any previously shown quotes (they carry their own as-of) but
        // surface the interruption; keep polling.
        setState((s) => ({ ...s, loading: false, error: FEED_ERROR }));
      } finally {
        if (mounted.current) timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();

    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [key]);

  return state;
}
