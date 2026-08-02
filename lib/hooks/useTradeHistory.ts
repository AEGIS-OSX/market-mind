"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface TradeRow {
  id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  executed_at: string;
  price_source: string | null;
  price_as_of: string | null;
  realized_pnl: number | null;
}

export interface TradeHistoryState {
  trades: TradeRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useTradeHistory(): TradeHistoryState {
  const [state, setState] = useState<Omit<TradeHistoryState, "refetch">>({
    trades: [],
    loading: true,
    error: null,
  });
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/trades");
      const d = await res.json();
      if (!mounted.current) return;
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setState({ trades: d.trades, loading: false, error: null });
    } catch (e) {
      if (!mounted.current) return;
      setState((s) => ({ ...s, loading: false, error: e instanceof Error ? e.message : String(e) }));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  return { ...state, refetch: load };
}
