import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface Signal {
  id: string
  ticker: string
  action: string
  confidence: number
  timestamp: string
  rationale: string
}

const StatusBadge = ({ variant, label }: { variant: 'buy' | 'sell' | 'hold'; label: string }) => {
  const colors = {
    buy: 'text-[var(--color-gain)] border-[var(--color-gain)]',
    sell: 'text-[var(--color-loss)] border-[var(--color-loss)]',
    hold: 'text-[var(--color-alert)] border-[var(--color-alert)]',
  }
  return (
    <span className={`px-2 py-0.5 text-[11px] font-[family-name:var(--font-body)] font-medium border rounded-[4px] ${colors[variant]}`}>
      {label}
    </span>
  )
}

const getConfidenceColor = (score: number) => {
  if (score >= 80) return 'text-[var(--color-gain)]'
  if (score >= 60) return 'text-[var(--color-alert)]'
  return 'text-[var(--color-loss)]'
}

const getBorderColor = (action: string) => {
  if (action === 'BUY') return 'border-l-[var(--color-gain)]'
  if (action === 'SELL') return 'border-l-[var(--color-loss)]'
  return 'border-l-[var(--color-alert)]'
}

export default async function SignalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: dbSignals } = await supabase
    .from('signals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const signals: Signal[] = (dbSignals || []).map((s) => ({
    id: s.id,
    ticker: s.symbol,
    action: s.signal_type,
    confidence: s.confidence || 0,
    timestamp: s.created_at ? new Date(s.created_at).toLocaleTimeString() : '',
    rationale: `Signal generated for ${s.symbol} with ${s.signal_type} action.`,
  }))

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
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a10 10 0 1 0 10 10" />
                <path d="M12 12L19 19" />
              </svg>
              <h2 className="text-[16px] font-[family-name:var(--font-display)] font-medium text-[var(--color-text-secondary)]">
                Scanning NASDAQ for opportunities.
              </h2>
            </div>
          ) : (
            signals.map((signal) => (
              <article
                key={signal.id}
                tabIndex={0}
                aria-label={`${signal.ticker} ${signal.action} signal, confidence ${signal.confidence}%.`}
                className={`flex items-center justify-between p-4 bg-[var(--color-surface-1)] border border-[var(--color-border)] border-l-4 ${getBorderColor(signal.action)} rounded-[var(--radius-panel)] cursor-default transition-colors duration-200 hover:bg-[var(--color-surface-2)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]`}
              >
                <div className="flex items-center gap-6">
                  <span className="text-[14px] font-medium w-12">{signal.ticker}</span>
                  <StatusBadge
                    variant={signal.action.toLowerCase() as 'buy' | 'sell' | 'hold'}
                    label={signal.action}
                  />
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] text-[var(--color-text-muted)] uppercase">Confidence</span>
                    <span className={`text-[14px] font-medium ${getConfidenceColor(signal.confidence)}`}>
                      {signal.confidence}%
                    </span>
                  </div>
                  <span className="text-[13px] text-[var(--color-text-muted)] w-20 text-right">
                    {signal.timestamp}
                  </span>
                </div>
              </article>
            ))
          )}
        </section>
      </main>
      <footer className="px-6 py-3 border-t border-[var(--color-border)] bg-[var(--color-surface-3)]">
        <p className="text-[11px] text-[var(--color-text-muted)] leading-relaxed">
          Market Mind is not a registered investment advisor. All trading involves risk. Past performance does not guarantee future results.
        </p>
      </footer>
    </div>
  )
}
