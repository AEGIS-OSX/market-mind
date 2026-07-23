import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface Position {
  ticker: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  marketValue: number;
  pnl: number;
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-[var(--space-6)] text-center">
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--color-text-secondary)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mb-[var(--space-2)]"
    >
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
    <p className="font-[family-name:var(--font-display)] text-[16px] font-medium text-[var(--color-text-secondary)]">
      No active positions.
    </p>
  </div>
);

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

// Table headers per Quinn's copy spec: Ticker, Position, Avg Price, Current Price, P&L, Value
const HEADERS = ["Ticker", "Position", "Avg Price", "Current Price", "P&L", "Value"];

export default async function PortfolioPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  let positions: Position[] = [];
  try {
    const { data: dbPositions } = await supabase
      .from("positions")
      .select("*")
      .eq("user_id", user.id);

    positions = (dbPositions || []).map((pos) => {
      const currentPrice = pos.current_price || pos.avg_cost || 0;
      const marketValue = pos.quantity * currentPrice;
      const costBasis = pos.quantity * (pos.avg_cost || 0);
      const pnl = marketValue - costBasis;
      return {
        ticker: pos.symbol,
        quantity: pos.quantity,
        avgPrice: pos.avg_cost || 0,
        currentPrice,
        marketValue,
        pnl,
      };
    });
  } catch {
    // show empty state on fetch error — prevents 500
  }

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      <header className="flex items-center h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Portfolio
        </h1>
      </header>
      <section className="flex-1 overflow-auto">
        {positions.length === 0 ? (
          <EmptyState />
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {HEADERS.map((header) => (
                  <th
                    key={header}
                    className="px-[12px] py-[8px] text-[11px] font-normal uppercase tracking-[0.08em] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const pnlColor =
                  pos.pnl >= 0
                    ? "text-[var(--color-gain)]"
                    : "text-[var(--color-loss)]";
                return (
                  <tr
                    key={pos.ticker}
                    className="h-[44px] border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors cursor-default"
                  >
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-ticker)] font-[500] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                      {pos.ticker}
                    </td>
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                      {pos.quantity}
                    </td>
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                      {formatCurrency(pos.avgPrice)}
                    </td>
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                      {formatCurrency(pos.currentPrice)}
                    </td>
                    <td className={`px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] ${pnlColor}`}>
                      {formatCurrency(pos.pnl)}
                    </td>
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                      {formatCurrency(pos.marketValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}