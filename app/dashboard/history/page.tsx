import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function HistoryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('user_id', user.id)
    .order('executed_at', { ascending: false })

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      <header className="flex items-center h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Trade History
        </h1>
      </header>
      <section className="flex-1 overflow-auto p-6">
        {(!trades || trades.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-[var(--space-6)] text-center">
            <p className="font-[family-name:var(--font-display)] text-[16px] font-medium text-[var(--color-text-secondary)]">
              No trades executed yet.
            </p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                {['Symbol', 'Side', 'Quantity', 'Price', 'Executed At'].map((header) => (
                  <th key={header} className="px-[12px] py-[8px] text-[11px] font-normal uppercase tracking-[0.08em] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr key={trade.id} className="h-[44px] border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors cursor-default">
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-primary)]">{trade.symbol}</td>
                  <td className={`px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] ${trade.side === 'buy' ? 'text-[var(--color-gain)]' : 'text-[var(--color-loss)]'}`}>{trade.side.toUpperCase()}</td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] text-[var(--color-text-primary)]">{trade.quantity}</td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] text-[var(--color-text-primary)]">${trade.price.toFixed(2)}</td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] text-[var(--color-text-primary)]">{new Date(trade.executed_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}
