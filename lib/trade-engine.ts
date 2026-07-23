import { getUserSettings } from "./db";

export interface TradeRecommendation {
  symbol: string;
  side: "buy" | "sell";
  qty: number;
  price?: number;
}

export interface TradeResult {
  placed: boolean;
  orderId?: string;
  message: string;
}

export async function executeTrade(
  recommendation: TradeRecommendation
): Promise<TradeResult> {
  const settings = getUserSettings();

  if (settings.execution_mode === "recommend") {
    return {
      placed: false,
      message: `RECOMMENDATION ONLY: ${recommendation.side} ${recommendation.qty} shares of ${recommendation.symbol}. User has not opted into auto-trading.`,
    };
  }

  if (settings.execution_mode === "auto") {
    const orderId = `order_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    return {
      placed: true,
      orderId,
      message: `Order placed: ${recommendation.side} ${recommendation.qty} shares of ${recommendation.symbol}`,
    };
  }

  return {
    placed: false,
    message: "Unknown execution mode",
  };
}
