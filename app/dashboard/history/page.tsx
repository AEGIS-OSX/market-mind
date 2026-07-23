import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Table headers per Quinn's copy spec: Date, Ticker, Action, Quantity, Price, Status, Rationale
const HEADERS = ["Date", "Ticker", "Action", "Quantity", "Price", "Status", "Rationale"];

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: number;
  price: number;
  executed_at: string;
  status?: string;
  rationale?: string;
}

export default async function HistoryPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  let trades: Trade[] = [];
  try {
    const { data: dbTrades } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .order("executed_at", { ascending: false });

    trades = dbTrades || [];
  } catch {
    // show empty state on fetch error — prevents 500
  }

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      <header className="flex items-center justify-between h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Trade History
        </h1>
        <div className="flex items-center gap-[8px]">
          <button className="px-[16px] py-[8px] font-[family-name:var(--font-body)] text-[var(--text-sm)] text-[var(--color-text-secondary)] border border-[var(--color-border)] rounded-[var(--radius-button)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-secondary)] transition-colors">
            Export CSV
          </button>
        </div>
      </header>
      <section className="flex-1 overflow-auto p-6">
        {trades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-[var(--space-6)] text-center">
            <p className="font-[family-name:var(--font-display)] text-[16px] font-medium text-[var(--color-text-secondary)]">
              No trades executed yet.
            </p>
          </div>
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
              {trades.map((trade) => {
                const actionColor =
                  trade.side === "buy"
                    ? "text-[var(--color-gain)]"
                    : "text-[var(--color-loss)]";
                const statusLabel = trade.status
                  ? trade.status.charAt(0).toUpperCase() + trade.status.slice(1)
                  : "Filled";
                const rationale = trade.rationale || "\u2014";
                return (
                  <tr
                    key={trade.id}
                    className="h-[44px] border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors cursor-default"
                  >
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-secondary)]">
                      {formatDate(trade.executed_at)}
                    </td>
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-ticker)] font-[500] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                      {trade.symbol}
                    </td>
                    <td className={`px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] font-[500] ${actionColor}`}>
                      {trade.side.toUpperCase()}
                    </td>
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                      {trade.quantity}
                    </td>
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                      {formatCurrency(trade.price)}
                    </td>
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-secondary)]">
                      {statusLabel}
                    </td>
                    <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-muted)] max-w-[240px] truncate">
                      {rationale}
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