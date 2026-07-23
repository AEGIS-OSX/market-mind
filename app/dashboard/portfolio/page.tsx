import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

interface Position {
  ticker: string
  quantity: number
  avgPrice: number
  currentPrice: number
  marketValue: number
  pnl: number
  pnlPercent: number
}

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-[var(--space-6)] text-center">
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-[var(--space-2)]">
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
    <p className="font-[family-name:var(--font-display)] text-[16px] font-medium text-[var(--color-text-secondary)]">
      No active positions.
    </p>
  </div>
)

export default async function PortfolioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: dbPositions } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', user.id)

  const positions: Position[] = (dbPositions || []).map((pos) => {
    const currentPrice = pos.current_price || pos.avg_cost
    const marketValue = pos.quantity * currentPrice
    const costBasis = pos.quantity * pos.avg_cost
    const pnl = marketValue - costBasis
    const pnlPercent = costBasis > 0 ? (pnl / costBasis) * 100 : 0
    return {
      ticker: pos.symbol,
      quantity: pos.quantity,
      avgPrice: pos.avg_cost,
      currentPrice,
      marketValue,
      pnl,
      pnlPercent,
    }
  })

  return (
    <main className="flex flex-col w-full min-h-screen bg-[var(--color-canvas)]">
      <header className="flex items-center h-[64px] px-[var(--space-3)] border-b border-[var(--color-border)]">
        <h1 className="font-[family-name:var(--font-display)] text-[var(--text-section-title)] font-medium text-[var(--color-text-primary)]">
          Portfolio
        </h1>
      </header>
      <section className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr>
              {['Ticker', 'Position', 'Avg Price', 'Current Price', 'Value', 'P&L', 'P&L %'].map((header) => (
                <th key={header} className="px-[12px] py-[8px] text-[11px] font-normal uppercase tracking-[0.08em] text-[var(--color-text-secondary)] border-b border-[var(--color-border)]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-0">
                  <EmptyState />
                </td>
              </tr>
            ) : (
              positions.map((pos) => (
                <tr key={pos.ticker} className="h-[44px] border-b border-[var(--color-border)] hover:bg-[var(--color-surface-2)] transition-colors cursor-default">
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-ticker)] font-medium text-[var(--color-text-primary)]">{pos.ticker}</td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] text-[var(--color-text-primary)]">{pos.quantity}</td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] text-[var(--color-text-primary)]">${pos.avgPrice.toFixed(2)}</td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] text-[var(--color-text-primary)]">${pos.currentPrice.toFixed(2)}</td>
                  <td className="px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] text-[var(--color-text-primary)]">${pos.marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={`px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] ${pos.pnl > 0 ? 'text-[var(--color-gain)]' : pos.pnl < 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-text-muted)]'}`}>
                    {pos.pnl > 0 ? '+' : ''}{pos.pnl.toFixed(2)}
                  </td>
                  <td className={`px-[12px] font-[family-name:var(--font-body)] text-[var(--text-base)] [font-feature-settings:'tnum'] ${pos.pnlPercent > 0 ? 'text-[var(--color-gain)]' : pos.pnlPercent < 0 ? 'text-[var(--color-loss)]' : 'text-[var(--color-text-muted)]'}`}>
                    {pos.pnlPercent > 0 ? '+' : ''}{pos.pnlPercent.toFixed(2)}%
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}
