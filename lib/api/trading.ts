import "server-only";
import { getQuote, normalizeSymbol, type Quote } from "@/lib/api/marketData";
import { getServiceClient } from "@/lib/api/serviceRole";

// Simulated trading engine. Market Mind is its own broker: orders fill at the
// real last price at order time, and the fill record stores that price, its
// source, and its as-of timestamp. Cash and positions are simulated; prices
// never are. A stale price is never a fill price -- if no provider can quote
// the symbol right now, the order is refused, not guessed.
//
// All writes go through the service role AFTER the caller has authenticated
// the user via the server-side Supabase session. user_id comes only from that
// session. Writes are ordered so the trade row (the audit record) commits
// LAST: a mid-sequence failure can lose an unrecorded mutation but can never
// record a trade that didn't settle.

export const STARTING_CASH = 100_000;
export const SIMULATED_LABEL =
  "Simulated portfolio — real market prices, simulated funds.";

export interface AccountRow {
  user_id: string;
  cash: number;
  starting_cash: number;
}

export interface TradeInput {
  userId: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  /** In recommend mode, true = the user's explicit one-tap approval */
  approved?: boolean;
}

export type TradeOutcome =
  | { status: 201; body: Record<string, unknown> }
  | { status: 200; body: Record<string, unknown> }
  | { status: 400 | 409 | 422 | 503; body: { error: string } };

export async function ensureAccount(userId: string): Promise<AccountRow | null> {
  const svc = getServiceClient();
  if (!svc) return null;
  const { data } = await svc.from("accounts").select("*").eq("user_id", userId).maybeSingle();
  if (data) return { ...data, cash: Number(data.cash), starting_cash: Number(data.starting_cash) };
  const fresh = { user_id: userId, cash: STARTING_CASH, starting_cash: STARTING_CASH };
  const { data: inserted, error } = await svc
    .from("accounts")
    .insert(fresh)
    .select("*")
    .single();
  if (error) {
    // Concurrent bootstrap: another request inserted first. Re-read.
    const { data: raced } = await svc.from("accounts").select("*").eq("user_id", userId).maybeSingle();
    if (raced) return { ...raced, cash: Number(raced.cash), starting_cash: Number(raced.starting_cash) };
    return null;
  }
  return { ...inserted, cash: Number(inserted.cash), starting_cash: Number(inserted.starting_cash) };
}

export async function executeTrade(input: TradeInput): Promise<TradeOutcome> {
  const svc = getServiceClient();
  if (!svc) {
    return {
      status: 503,
      body: { error: "Trading engine not configured (missing service credentials). No order was placed." },
    };
  }

  const symbol = normalizeSymbol(input.symbol);
  if (!symbol) return { status: 400, body: { error: "Invalid symbol." } };
  const quantity = input.quantity;
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { status: 400, body: { error: "quantity must be a positive number." } };
  }

  // Settings drive execution mode and the cap. Missing row = safe defaults.
  const { data: settings } = await svc
    .from("user_settings")
    .select("execution_mode, investment_cap")
    .eq("user_id", input.userId)
    .maybeSingle();
  const executionMode = settings?.execution_mode === "auto" ? "auto" : "recommend";
  const investmentCap =
    settings?.investment_cap == null ? null : Number(settings.investment_cap);

  // Real price or no fill. A stale cache price is refused explicitly.
  let quote: Quote;
  try {
    quote = await getQuote(symbol);
  } catch (e) {
    return {
      status: 422,
      body: { error: `No market data available for ${symbol}. Order refused — nothing was filled. (${e instanceof Error ? e.message : e})` },
    };
  }
  if (quote.freshness === "stale") {
    return {
      status: 409,
      body: {
        error: `Market data for ${symbol} is stale (last real price ${quote.price} as of ${quote.asOf}, source ${quote.source}). Refusing to fill at a stale price.`,
      },
    };
  }

  const notional = quote.price * quantity;

  if (executionMode === "recommend" && !input.approved) {
    return {
      status: 200,
      body: {
        placed: false,
        recommendation: {
          symbol,
          side: input.side,
          quantity,
          price: quote.price,
          priceSource: quote.source,
          priceAsOf: quote.asOf,
          notional,
        },
        message: `RECOMMENDATION ONLY: ${input.side} ${quantity} ${symbol} at ${quote.price} (${quote.source}, as of ${quote.asOf}). Approve to execute in the simulated portfolio.`,
      },
    };
  }

  const account = await ensureAccount(input.userId);
  if (!account) return { status: 503, body: { error: "Could not load simulated account." } };

  const { data: position } = await svc
    .from("positions")
    .select("*")
    .eq("user_id", input.userId)
    .eq("symbol", symbol)
    .maybeSingle();
  const posQty = position ? Number(position.quantity) : 0;
  const posAvg = position ? Number(position.avg_cost) : 0;

  if (input.side === "buy") {
    if (investmentCap != null) {
      // Cap = max total cost basis Market Mind may deploy.
      const { data: allPos } = await svc
        .from("positions")
        .select("quantity, avg_cost")
        .eq("user_id", input.userId);
      const deployed = (allPos || []).reduce(
        (s, p) => s + Number(p.quantity) * Number(p.avg_cost),
        0
      );
      if (deployed + notional > investmentCap) {
        return { status: 422, body: { error: "Trade blocked. Investment cap reached." } };
      }
    }
    if (notional > account.cash) {
      return {
        status: 422,
        body: { error: `Insufficient simulated cash: order notional $${notional.toFixed(2)} exceeds balance $${account.cash.toFixed(2)}.` },
      };
    }

    const newQty = posQty + quantity;
    const newAvg = (posQty * posAvg + notional) / newQty;
    const { error: posErr } = await svc.from("positions").upsert(
      {
        user_id: input.userId,
        symbol,
        quantity: newQty,
        avg_cost: newAvg,
        current_price: quote.price,
      },
      { onConflict: "user_id,symbol" }
    );
    if (posErr) return { status: 503, body: { error: `Position write failed: ${posErr.message}` } };
    const { error: cashErr } = await svc
      .from("accounts")
      .update({ cash: account.cash - notional })
      .eq("user_id", input.userId);
    if (cashErr) return { status: 503, body: { error: `Cash update failed: ${cashErr.message}` } };

    const { data: trade, error: tradeErr } = await svc
      .from("trades")
      .insert({
        user_id: input.userId,
        symbol,
        side: "buy",
        quantity,
        price: quote.price,
        executed_at: new Date().toISOString(),
        price_source: quote.source,
        price_as_of: quote.asOf,
      })
      .select("id")
      .single();
    if (tradeErr) return { status: 503, body: { error: `Trade log failed: ${tradeErr.message}` } };

    return {
      status: 201,
      body: {
        placed: true,
        simulated: true,
        tradeId: trade.id,
        fill: { symbol, side: "buy", quantity, price: quote.price, notional, priceSource: quote.source, priceAsOf: quote.asOf, freshness: quote.freshness },
        message: `Simulated fill: bought ${quantity} ${symbol} at ${quote.price} (${quote.source}, as of ${quote.asOf}). ${SIMULATED_LABEL}`,
      },
    };
  }

  // sell
  if (posQty < quantity) {
    return {
      status: 422,
      body: { error: `Cannot sell ${quantity} ${symbol}: position holds ${posQty}.` },
    };
  }
  const realized = (quote.price - posAvg) * quantity;
  const remaining = posQty - quantity;

  if (remaining === 0) {
    const { error } = await svc
      .from("positions")
      .delete()
      .eq("user_id", input.userId)
      .eq("symbol", symbol);
    if (error) return { status: 503, body: { error: `Position close failed: ${error.message}` } };
  } else {
    const { error } = await svc
      .from("positions")
      .update({ quantity: remaining, current_price: quote.price })
      .eq("user_id", input.userId)
      .eq("symbol", symbol);
    if (error) return { status: 503, body: { error: `Position update failed: ${error.message}` } };
  }
  const { error: cashErr } = await svc
    .from("accounts")
    .update({ cash: account.cash + notional })
    .eq("user_id", input.userId);
  if (cashErr) return { status: 503, body: { error: `Cash update failed: ${cashErr.message}` } };

  const { data: trade, error: tradeErr } = await svc
    .from("trades")
    .insert({
      user_id: input.userId,
      symbol,
      side: "sell",
      quantity,
      price: quote.price,
      executed_at: new Date().toISOString(),
      price_source: quote.source,
      price_as_of: quote.asOf,
      realized_pnl: realized,
    })
    .select("id")
    .single();
  if (tradeErr) return { status: 503, body: { error: `Trade log failed: ${tradeErr.message}` } };

  return {
    status: 201,
    body: {
      placed: true,
      simulated: true,
      tradeId: trade.id,
      fill: { symbol, side: "sell", quantity, price: quote.price, notional, realizedPnl: realized, priceSource: quote.source, priceAsOf: quote.asOf, freshness: quote.freshness },
      message: `Simulated fill: sold ${quantity} ${symbol} at ${quote.price} (${quote.source}, as of ${quote.asOf}). Realized P&L $${realized.toFixed(2)}. ${SIMULATED_LABEL}`,
    },
  };
}
