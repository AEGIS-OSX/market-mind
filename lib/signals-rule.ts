// Signal rule: SMA 20/50 crossover on daily closes. Pure computation over
// fetched bars -- this module never fetches and never invents a number. The
// rule text below is DISPLAYED in the UI next to every signal (T-009/E:
// "the rule must be visible", no opaque scores).

import type { DailyBar } from "@/lib/api/marketData";

export const SIGNAL_RULE_TEXT =
  "Rule: SMA 20/50 crossover on daily closes. BUY when the 20-day average " +
  "crosses above the 50-day within the last 10 sessions; SELL when it " +
  "crosses below. All figures computed from the fetched bars shown.";

export const MIN_BARS = 50;
const CROSSOVER_LOOKBACK = 10;

export type SignalOutcome =
  | {
      kind: "signal";
      action: "BUY" | "SELL" | "NONE";
      sma20: number;
      sma50: number;
      /** (sma20 - sma50) / sma50, in percent */
      spreadPct: number;
      /** date of the most recent crossover inside the lookback, if any */
      crossoverDate: string | null;
      lastClose: number;
      lastBarDate: string;
      barsUsed: number;
    }
  | {
      kind: "insufficient";
      reason: string;
      barsAvailable: number;
      barsNeeded: number;
    };

function smaAt(closes: number[], endIdx: number, window: number): number {
  let sum = 0;
  for (let i = endIdx - window + 1; i <= endIdx; i++) sum += closes[i];
  return sum / window;
}

export function computeSignal(bars: DailyBar[]): SignalOutcome {
  if (bars.length < MIN_BARS) {
    return {
      kind: "insufficient",
      reason: `Not enough history to compute SMA 20/50 (need ${MIN_BARS} daily bars, have ${bars.length}).`,
      barsAvailable: bars.length,
      barsNeeded: MIN_BARS,
    };
  }

  const closes = bars.map((b) => b.close);
  const last = closes.length - 1;

  const sma20 = smaAt(closes, last, 20);
  const sma50 = smaAt(closes, last, 50);

  // Walk back looking for the most recent sign change of (sma20 - sma50).
  let crossoverDate: string | null = null;
  let crossoverDir: "up" | "down" | null = null;
  const maxBack = Math.min(CROSSOVER_LOOKBACK, last - MIN_BARS + 1);
  let prevDiff = sma20 - sma50;
  for (let back = 1; back <= maxBack; back++) {
    const idx = last - back;
    const diff = smaAt(closes, idx, 20) - smaAt(closes, idx, 50);
    if (diff <= 0 && prevDiff > 0) {
      crossoverDate = bars[idx + 1].date;
      crossoverDir = "up";
      break;
    }
    if (diff >= 0 && prevDiff < 0) {
      crossoverDate = bars[idx + 1].date;
      crossoverDir = "down";
      break;
    }
    prevDiff = diff;
  }

  const action: "BUY" | "SELL" | "NONE" =
    crossoverDir === "up" ? "BUY" : crossoverDir === "down" ? "SELL" : "NONE";

  return {
    kind: "signal",
    action,
    sma20,
    sma50,
    spreadPct: ((sma20 - sma50) / sma50) * 100,
    crossoverDate,
    lastClose: closes[last],
    lastBarDate: bars[last].date,
    barsUsed: bars.length,
  };
}
