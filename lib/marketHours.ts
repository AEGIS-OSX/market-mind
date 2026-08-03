// US equity market hours, computed -- no network, no state. Pure so it can be
// unit-tested with a faked clock and shared by server routes and client code.
//
// Regular session: 09:30-16:00 ET, Monday-Friday, excluding full-day holidays.
// Early-close days end at 13:00 ET. Holiday tables are per-year constants for
// NYSE/Nasdaq; extend the table when a new year approaches.

export interface MarketStatus {
  open: boolean;
  /** "open" | "closed" -- coarse state */
  state: "open" | "closed";
  /** Human label, e.g. "Market open until 4:00 PM ET" / "Market closed" */
  label: string;
  /** True when today is a 13:00 ET early close */
  earlyClose: boolean;
  /** The ET wall-clock time used for the decision, ISO-ish for display */
  etTime: string;
}

// Full-day closures (YYYY-MM-DD, ET).
const HOLIDAYS = new Set([
  // 2026
  "2026-01-01", // New Year's Day
  "2026-01-19", // MLK Day
  "2026-02-16", // Presidents' Day
  "2026-04-03", // Good Friday
  "2026-05-25", // Memorial Day
  "2026-06-19", // Juneteenth
  "2026-07-03", // Independence Day (observed)
  "2026-09-07", // Labor Day
  "2026-11-26", // Thanksgiving
  "2026-12-25", // Christmas
  // 2027
  "2027-01-01",
  "2027-01-18",
  "2027-02-15",
  "2027-03-26", // Good Friday
  "2027-05-31",
  "2027-06-18", // Juneteenth (observed)
  "2027-07-05", // Independence Day (observed)
  "2027-09-06",
  "2027-11-25",
  "2027-12-24", // Christmas (observed)
]);

// 13:00 ET early closes.
const EARLY_CLOSES = new Set([
  "2026-11-27", // day after Thanksgiving
  "2026-12-24", // Christmas Eve
  "2027-11-26",
]);

interface EtParts {
  date: string; // YYYY-MM-DD
  weekday: number; // 0=Sun..6=Sat
  minutes: number; // minutes since ET midnight
  display: string;
}

/** Decompose an instant into ET wall-clock parts via Intl (DST-correct). */
export function toEtParts(now: Date): EtParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of fmt.formatToParts(now)) parts[p.type] = p.value;
  const weekdayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const hour = Number(parts.hour) % 24; // Intl can emit "24" at midnight
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: weekdayMap[parts.weekday] ?? 0,
    minutes: hour * 60 + Number(parts.minute),
    display: `${parts.hour}:${parts.minute}:${parts.second} ET ${parts.year}-${parts.month}-${parts.day}`,
  };
}

const OPEN_MIN = 9 * 60 + 30; // 09:30
const CLOSE_MIN = 16 * 60; // 16:00
const EARLY_CLOSE_MIN = 13 * 60; // 13:00

export function getMarketStatus(now: Date): MarketStatus {
  const et = toEtParts(now);
  const isWeekend = et.weekday === 0 || et.weekday === 6;
  const isHoliday = HOLIDAYS.has(et.date);
  const earlyClose = EARLY_CLOSES.has(et.date);
  const closeMin = earlyClose ? EARLY_CLOSE_MIN : CLOSE_MIN;

  const open =
    !isWeekend &&
    !isHoliday &&
    et.minutes >= OPEN_MIN &&
    et.minutes < closeMin;

  let label: string;
  if (open) {
    label = earlyClose
      ? "Market open — early close 1:00 PM ET"
      : "Market open until 4:00 PM ET";
  } else if (isWeekend) {
    label = "Market closed — weekend";
  } else if (isHoliday) {
    label = "Market closed — holiday";
  } else if (et.minutes < OPEN_MIN) {
    label = "Market closed — opens 9:30 AM ET";
  } else {
    label = "Market closed";
  }

  return { open, state: open ? "open" : "closed", label, earlyClose, etTime: et.display };
}

/**
 * The most recent calendar date whose regular session was COMPLETE at
 * `asOf` -- the newest daily bar that can be trusted as a settled close.
 *
 * A daily bar for a session still in progress carries whatever the price
 * happened to be at the moment it was captured, so feeding it to an SMA makes
 * the signal depend on what time the data was fetched. Today's bar counts
 * only once today's session has actually ended.
 *
 * Correct outside a live session too, because it reuses the same holiday and
 * early-close tables as getMarketStatus:
 *   - during the session      -> yesterday (today is still forming)
 *   - premarket               -> yesterday (today has not opened)
 *   - after the close         -> today (the session completed)
 *   - after an early close    -> today, from 13:00 ET
 *   - weekend / full holiday  -> yesterday, since today is not a session
 *
 * Returns a calendar date, which is only an upper bound: no bar exists for a
 * non-trading day, so `date <= cutoff` still keeps everything through the
 * last real session.
 */
export function settledThroughDate(asOf: Date): string {
  const et = toEtParts(asOf);
  const isWeekend = et.weekday === 0 || et.weekday === 6;
  const isHoliday = HOLIDAYS.has(et.date);
  const closeMin = EARLY_CLOSES.has(et.date) ? EARLY_CLOSE_MIN : CLOSE_MIN;
  const todaysSessionComplete = !isWeekend && !isHoliday && et.minutes >= closeMin;
  if (todaysSessionComplete) return et.date;

  // Previous calendar day, computed in UTC on the ET date string so it cannot
  // be shifted by the local timezone of whatever machine is running this.
  const [y, m, d] = et.date.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 1, d));
  prev.setUTCDate(prev.getUTCDate() - 1);
  return prev.toISOString().slice(0, 10);
}

/** Keep only bars whose session had completed at `asOf`. */
export function settledBarsOnly<T extends { date: string }>(bars: T[], asOf: Date): T[] {
  const cutoff = settledThroughDate(asOf);
  return bars.filter((b) => b.date <= cutoff);
}
