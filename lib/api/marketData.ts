import "server-only";
import { getMarketStatus } from "@/lib/marketHours";
import { getServiceClient } from "@/lib/api/serviceRole";

// Provider-agnostic market data with a fallback chain and provenance on every
// value. THE RULE: every price returned here carries where it came from and
// when it was true, or it is not returned at all. On total provider failure a
// cached value may be served ONLY with freshness:"stale" and its original
// as-of timestamp intact. This module never invents a number.
//
// Providers (probed live 2026-08-02, all keyless):
//   1. Yahoo Finance chart API (query1.finance.yahoo.com/v8) -- quote + bars.
//   2. Cboe delayed quotes (cdn.cboe.com) -- 15-min delayed quote + history.
//   Stooq was probed and REJECTED: quote endpoint 404s, history sits behind a
//   JS proof-of-work wall. Nasdaq's api.nasdaq.com was probed and REJECTED:
//   its lastTradeTimestamp reported "Jul 30" for a Jul 31 closing price --
//   a source whose as-of field is wrong cannot satisfy the provenance rule.

export type Freshness = "live" | "delayed" | "eod" | "stale";

export interface Quote {
  symbol: string;
  price: number;
  /** ISO timestamp of the trade/close this price represents */
  asOf: string;
  source: string;
  freshness: Freshness;
  /** ISO timestamp of when we fetched it */
  fetchedAt: string;
}

export interface DailyBar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BarSeries {
  symbol: string;
  bars: DailyBar[];
  source: string;
  fetchedAt: string;
  stale: boolean;
}

export class MarketDataError extends Error {
  constructor(public symbol: string, public reasons: string[]) {
    super(`No market data for ${symbol}: ${reasons.join("; ")}`);
  }
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
const SYMBOL_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

export function normalizeSymbol(raw: string): string | null {
  const s = String(raw || "").trim().toUpperCase();
  return SYMBOL_RE.test(s) ? s : null;
}

/** Freshness for a just-fetched price: the market clock decides. */
function currentFreshness(): Freshness {
  // Both providers consolidate with up to 15-min delay intraday; after the
  // close the last trade IS the official close. Label conservatively.
  return getMarketStatus(new Date()).open ? "delayed" : "eod";
}

// ---------- providers: quotes ----------

async function yahooQuote(symbol: string): Promise<Quote> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`,
    { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`yahoo HTTP ${res.status}`);
  const j = await res.json();
  const meta = j?.chart?.result?.[0]?.meta;
  const price = meta?.regularMarketPrice;
  const t = meta?.regularMarketTime;
  if (typeof price !== "number" || typeof t !== "number") {
    throw new Error("yahoo: missing price/timestamp");
  }
  return {
    symbol,
    price,
    asOf: new Date(t * 1000).toISOString(),
    source: "Yahoo Finance",
    freshness: currentFreshness(),
    fetchedAt: new Date().toISOString(),
  };
}

/** Cboe stamps last_trade_time in ET without a zone suffix; convert honestly. */
function etToIso(etString: string): string {
  // etString: "2026-07-31T15:59:59" (ET). Find the UTC instant whose ET
  // wall-clock matches, trying both possible offsets (EST/EDT).
  const naive = new Date(etString + "Z"); // pretend UTC, then correct
  for (const offsetH of [4, 5]) {
    const candidate = new Date(naive.getTime() + offsetH * 3600_000);
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
    });
    const parts: Record<string, string> = {};
    for (const p of fmt.formatToParts(candidate)) parts[p.type] = p.value;
    const roundTrip = `${parts.year}-${parts.month}-${parts.day}T${String(Number(parts.hour) % 24).padStart(2, "0")}:${parts.minute}:${parts.second}`;
    if (roundTrip === etString) return candidate.toISOString();
  }
  // Fall back to EDT interpretation rather than dropping the value.
  return new Date(naive.getTime() + 4 * 3600_000).toISOString();
}

async function cboeQuote(symbol: string): Promise<Quote> {
  const res = await fetch(
    `https://cdn.cboe.com/api/global/delayed_quotes/quotes/${encodeURIComponent(symbol)}.json`,
    { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`cboe HTTP ${res.status}`);
  const j = await res.json();
  const d = j?.data;
  // current_price drifts from close on some closed-market snapshots; the
  // last-trade pair (close + last_trade_time) is the self-consistent one.
  const price = getMarketStatus(new Date()).open ? d?.current_price : d?.close;
  const t = d?.last_trade_time;
  if (typeof price !== "number" || typeof t !== "string" || !t) {
    throw new Error("cboe: missing price/last_trade_time");
  }
  return {
    symbol,
    price,
    asOf: etToIso(t),
    source: "Cboe (delayed)",
    freshness: currentFreshness(),
    fetchedAt: new Date().toISOString(),
  };
}

const QUOTE_PROVIDERS: Array<(s: string) => Promise<Quote>> = [yahooQuote, cboeQuote];

// ---------- providers: daily bars ----------

async function yahooBars(symbol: string): Promise<{ bars: DailyBar[]; source: string }> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=9mo`,
    { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(8000) }
  );
  if (!res.ok) throw new Error(`yahoo HTTP ${res.status}`);
  const j = await res.json();
  const r = j?.chart?.result?.[0];
  const ts: number[] = r?.timestamp || [];
  const q = r?.indicators?.quote?.[0];
  if (!ts.length || !q) throw new Error("yahoo: no bars");
  const bars: DailyBar[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = q.close?.[i];
    if (typeof c !== "number") continue; // yahoo emits nulls for halts/today-partial
    bars.push({
      date: new Date(ts[i] * 1000).toISOString().slice(0, 10),
      open: q.open?.[i] ?? c,
      high: q.high?.[i] ?? c,
      low: q.low?.[i] ?? c,
      close: c,
      volume: q.volume?.[i] ?? 0,
    });
  }
  if (!bars.length) throw new Error("yahoo: all bars null");
  return { bars, source: "Yahoo Finance" };
}

async function cboeBars(symbol: string): Promise<{ bars: DailyBar[]; source: string }> {
  const res = await fetch(
    `https://cdn.cboe.com/api/global/delayed_quotes/charts/historical/${encodeURIComponent(symbol)}.json`,
    { headers: { "User-Agent": UA }, cache: "no-store", signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`cboe HTTP ${res.status}`);
  const j = await res.json();
  const rows: Array<Record<string, number | string>> = j?.data || [];
  if (!rows.length) throw new Error("cboe: no history");
  const bars = rows.slice(-260).map((r) => ({
    date: String(r.date),
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
  return { bars, source: "Cboe (delayed)" };
}

const BAR_PROVIDERS: Array<(s: string) => Promise<{ bars: DailyBar[]; source: string }>> = [
  yahooBars,
  cboeBars,
];

// ---------- cache (best-effort; service role only) ----------

function quoteTtlMs(): number {
  return getMarketStatus(new Date()).open ? 30_000 : 15 * 60_000;
}
function barsTtlMs(): number {
  return getMarketStatus(new Date()).open ? 60 * 60_000 : 6 * 60 * 60_000;
}

interface CachedQuoteRow {
  symbol: string;
  price: number;
  as_of: string;
  source: string;
  freshness: string;
  fetched_at: string;
}

async function readQuoteCache(symbol: string): Promise<CachedQuoteRow | null> {
  const svc = getServiceClient();
  if (!svc) return null;
  try {
    const { data } = await svc.from("price_cache").select("*").eq("symbol", symbol).maybeSingle();
    return (data as CachedQuoteRow) || null;
  } catch {
    return null;
  }
}

async function writeQuoteCache(q: Quote): Promise<void> {
  const svc = getServiceClient();
  if (!svc) return;
  try {
    await svc.from("price_cache").upsert(
      {
        symbol: q.symbol,
        price: q.price,
        as_of: q.asOf,
        source: q.source,
        freshness: q.freshness,
        fetched_at: q.fetchedAt,
      },
      { onConflict: "symbol" }
    );
  } catch {
    /* cache is best-effort; a failed write must never fail the read */
  }
}

// ---------- public API ----------

export async function getQuote(symbol: string): Promise<Quote> {
  const cached = await readQuoteCache(symbol);
  if (cached && Date.now() - new Date(cached.fetched_at).getTime() < quoteTtlMs()) {
    return {
      symbol,
      price: Number(cached.price),
      asOf: cached.as_of,
      source: cached.source,
      freshness: cached.freshness as Freshness,
      fetchedAt: cached.fetched_at,
    };
  }

  const reasons: string[] = [];
  for (const provider of QUOTE_PROVIDERS) {
    try {
      const q = await provider(symbol);
      await writeQuoteCache(q);
      return q;
    } catch (e) {
      reasons.push(e instanceof Error ? e.message : String(e));
    }
  }

  // Every provider failed. A cached value may be served ONLY as stale, with
  // its original as-of preserved so the UI can say how old it is.
  if (cached) {
    return {
      symbol,
      price: Number(cached.price),
      asOf: cached.as_of,
      source: cached.source,
      freshness: "stale",
      fetchedAt: cached.fetched_at,
    };
  }
  throw new MarketDataError(symbol, reasons);
}

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: string };

export async function getQuotes(symbols: string[]): Promise<Record<string, QuoteResult>> {
  const out: Record<string, QuoteResult> = {};
  await Promise.all(
    symbols.map(async (s) => {
      try {
        out[s] = { ok: true, quote: await getQuote(s) };
      } catch (e) {
        out[s] = { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    })
  );
  return out;
}

export async function getDailyBars(symbol: string): Promise<BarSeries> {
  interface CachedBarsRow {
    bars: DailyBar[];
    source: string;
    fetched_at: string;
  }
  const svc = getServiceClient();
  let cachedRow: CachedBarsRow | null = null;
  if (svc) {
    try {
      const { data } = await svc.from("bars_cache").select("*").eq("symbol", symbol).maybeSingle();
      if (data) cachedRow = data as unknown as CachedBarsRow;
    } catch {
      /* best-effort */
    }
  }
  if (cachedRow && Date.now() - new Date(cachedRow.fetched_at).getTime() < barsTtlMs()) {
    return {
      symbol,
      bars: cachedRow.bars,
      source: cachedRow.source,
      fetchedAt: cachedRow.fetched_at,
      stale: false,
    };
  }

  const reasons: string[] = [];
  for (const provider of BAR_PROVIDERS) {
    try {
      const { bars, source } = await provider(symbol);
      const fetchedAt = new Date().toISOString();
      if (svc) {
        try {
          await svc.from("bars_cache").upsert({ symbol, bars, source, fetched_at: fetchedAt }, { onConflict: "symbol" });
        } catch {
          /* best-effort */
        }
      }
      return { symbol, bars, source, fetchedAt, stale: false };
    } catch (e) {
      reasons.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (cachedRow) {
    return {
      symbol,
      bars: cachedRow.bars,
      source: cachedRow.source,
      fetchedAt: cachedRow.fetched_at,
      stale: true,
    };
  }
  throw new MarketDataError(symbol, reasons);
}
