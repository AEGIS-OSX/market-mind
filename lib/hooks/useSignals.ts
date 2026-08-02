"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface SignalRow {
  symbol: string;
  outcome:
    | {
        kind: "signal";
        action: "BUY" | "SELL" | "NONE";
        sma20: number;
        sma50: number;
        spreadPct: number;
        crossoverDate: string | null;
        lastClose: number;
        lastBarDate: string;
        barsUsed: number;
      }
    | { kind: "insufficient"; reason: string; barsAvailable: number; barsNeeded: number }
    | null;
  source?: string;
  fetchedAt?: string;
  stale?: boolean;
  error?: string;
}

export interface SignalsState {
  rule: string | null;
  signals: SignalRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_MS = 60_000;

export function useSignals(): SignalsState {
  const [state, setState] = useState<Omit<SignalsState, "refetch">>({
    rule: null,
    signals: [],
    loading: true,
    error: null,
  });
  const mounted = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/signals");
      const d = await res.json();
      if (!mounted.current) return;
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setState({ rule: d.rule, signals: d.signals, loading: false, error: null });
    } catch (e) {
      if (!mounted.current) return;
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const tick = async () => {
      await load();
      if (mounted.current) timerRef.current = setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      mounted.current = false;
      clearTimeout(timerRef.current);
    };
  }, [load]);

  return { ...state, refetch: load };
}
