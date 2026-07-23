import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface Signal {
  id: string;
  ticker: string;
  action: string;
  confidence: number;
  timestamp: string;
  rationale: string;
}

const StatusBadge = ({
  variant,
  label,
}: {
  variant: "buy" | "sell" | "hold";
  label: string;
}) => {
  const colors = {
    buy: "text-[var(--color-gain)] border-[var(--color-gain)]",
    sell: "text-[var(--color-loss)] border-[var(--color-loss)]",
    hold: "text-[var(--color-alert)] border-[var(--color-alert)]",
  };
  return (
    <span
      className={`px-2 py-0.5 text-[11px] font-[family-name:var(--font-body)] font-medium border rounded-[4px] ${colors[variant]}`}
    >
      {label}
    </span>
  );
};

const getConfidenceColor = (score: number) => {
  if (score >= 80) return "text-[var(--color-gain)]";
  if (score >= 60) return "text-[var(--color-alert)]";
  return "text-[var(--color-loss)]";
};

const getBorderColor = (action: string) => {
  if (action === "BUY") return "border-l-[var(--color-gain)]";
  if (action === "SELL") return "border-l-[var(--color-loss)]";
  return "border-l-[var(--color-alert)]";
};

export default async function SignalsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  let signals: Signal[] = [];
  try {
    const { data: dbSignals } = await supabase
      .from("signals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    signals = (dbSignals || []).map((s) => ({
      id: s.id,
      ticker: s.symbol,
      action: s.signal_type,
      confidence: s.confidence || 0,
      timestamp: s.created_at
        ? new Date(s.created_at).toLocaleTimeString()
        : "",
      rationale: s.rationale || `Signal generated for ${s.symbol} with ${s.signal_type} action.`,
    }));
  } catch {
    // show empty state on fetch error — prevents 500
  }

  return (
    <div className="flex flex-col h-full bg-[var(--color-canvas)] text-[var(--color-text-primary)] font-[family-name:var(--font-body)]">
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface-1)]">
        <h1 className="text-[22px] font-[family-name:var(--font-display)] font-medium">
          Live Signals
        </h1>
      </header>
      <main className="flex flex-1 overflow-hidden">
        <section className="flex-1 overflow-y-auto p-6 space-y-3">
          {signals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4 py-[var(--space-6)]">
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-text-muted)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
              <p className="font-[family-name:var(--font-display)] text-[16px] font-medium text-[var(--color-text-secondary)]">
                Scanning NASDAQ for opportunities.
              </p>
            </div>
          ) : (
            signals.map((signal) => {
              const actionVariant =
                signal.action === "BUY"
                  ? "buy"
                  : signal.action === "SELL"
                  ? "sell"
                  : "hold";
              const borderColor = getBorderColor(signal.action);
              const confidenceColor = getConfidenceColor(signal.confidence);
              return (
                <article
                  key={signal.id}
                  className={`bg-[var(--color-surface-1)] border border-[var(--color-border)] border-l-4 ${borderColor} rounded-[var(--radius-panel)] p-4`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="font-[family-name:var(--font-body)] text-[var(--text-ticker)] font-[500] text-[var(--color-text-primary)] [font-feature-settings:'tnum']">
                        {signal.ticker}
                      </span>
                      <StatusBadge variant={actionVariant} label={signal.action} />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-[family-name:var(--font-body)] text-[var(--text-sm)] font-[500] [font-feature-settings:'tnum'] ${confidenceColor}`}>
                        {signal.confidence}% Confidence
                      </span>
                      <span className="font-[family-name:var(--font-body)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
                        {signal.timestamp}
                      </span>
                    </div>
                  </div>
                  <p className="font-[family-name:var(--font-body)] text-[var(--text-rationale)] text-[var(--color-text-secondary)] leading-[1.6]">
                    {signal.rationale}
                  </p>
                </article>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}