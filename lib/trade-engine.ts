// Trade decision logic. Pure: settings come in as an argument (read from
// user_settings by the caller) -- no filesystem, no global store.
//
// There is NO brokerage integration (no Alpaca credentials exist). The engine
// therefore never claims an order was placed with a broker and never invents
// order ids: in auto mode the caller records the execution decision to the
// trades table and reports it honestly as a simulated execution.

export interface TradeRecommendation {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price?: number;
}

export type TradeDecision =
  | { action: "recommend_only"; message: string }
  | { action: "record"; message: string };

export function decideTrade(
  executionMode: "auto" | "recommend",
  recommendation: TradeRecommendation
): TradeDecision {
  const summary = `${recommendation.side} ${recommendation.qty} shares of ${recommendation.symbol}`;

  if (executionMode === "recommend") {
    return {
      action: "recommend_only",
      message: `RECOMMENDATION ONLY: ${summary}. User has not opted into auto-trading.`,
    };
  }

  return {
    action: "record",
    message: `Simulated execution recorded: ${summary}. No brokerage is connected -- no live order was placed.`,
  };
}
