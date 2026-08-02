"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface Holding {
  symbol: string;
  quantity: number;
  avgCost: number;
  price: number | null;
  priceSource?: string;
  priceAsOf?: string;
  freshness?: string;
  marketValue?: number;
  openPnl?: number;
  priceError?: string;
  excludedFromTotals?: boolean;
}

export interface PortfolioState {
  label: string | null;
  cash: number | null;
  startingCash: number | null;
  holdings: Holding[];
  totals: {
    marketValue: number;
    portfolioValue: number;
    openPnl: number;
    closedPnl: number;
    totalReturnPct: number;
    partial: boolean;
  } | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const POLL_MS = 30_000;

export function usePortfolio(): PortfolioState {
  const [state, setState] = useState<Omit<PortfolioState, "refetch">>({
    label: null,
    cash: null,
    startingCash: null,
    holdings: [],
    totals: null,
    loading: true,
    error: null,
  });
  const mounted = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/portfolio");
      const d = await res.json();
      if (!mounted.current) return;
      if (!res.ok) throw new Error(d.error || `HTTP ${res.status}`);
      setState({
        label: d.label,
        cash: d.account.cash,
        startingCash: d.account.startingCash,
        holdings: d.holdings,
        totals: d.totals,
        loading: false,
        error: null,
      });
    } catch (e) {
      if (!mounted.current) return;
      setState((s) => ({
        ...s,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      }));
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
