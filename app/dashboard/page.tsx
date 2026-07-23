import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  return (
    <main className="flex-1 flex flex-col min-h-screen bg-[var(--color-canvas)]">
      <header className="h-12 border-b border-[var(--color-border)] px-6 flex items-center justify-between shrink-0">
        <h1 className="text-[16px] font-[family-name:var(--font-display)] font-medium text-[var(--color-text-primary)]">
          Dashboard
        </h1>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-surface-3)] border border-[var(--color-border)]">
          <div className="w-2 h-2 rounded-full bg-[var(--color-gain)]" />
          <span className="text-[13px] font-[family-name:var(--font-body)] text-[var(--color-gain)]">
            NASDAQ Open
          </span>
        </div>
      </header>
      <section className="p-6 grid grid-cols-1 min-[480px]:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)]">
          <p className="text-[13px] font-[family-name:var(--font-body)] text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Portfolio Value</p>
          <span className="text-[48px] font-[family-name:var(--font-display)] font-semibold leading-[1.1] text-[var(--color-text-primary)]">$24,831.50</span>
        </div>
        <div className="p-6 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)]">
          <p className="text-[13px] font-[family-name:var(--font-body)] text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Open P&L</p>
          <span className="text-[48px] font-[family-name:var(--font-display)] font-semibold leading-[1.1] text-[var(--color-text-primary)]">+$312.40</span>
          <span className="text-[13px] font-[family-name:var(--font-body)] text-[var(--color-gain)]">+1.27%</span>
        </div>
        <div className="p-6 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)]">
          <p className="text-[13px] font-[family-name:var(--font-body)] text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Closed P&L</p>
          <span className="text-[48px] font-[family-name:var(--font-display)] font-semibold leading-[1.1] text-[var(--color-text-primary)]">+$1,204.80</span>
          <span className="text-[13px] font-[family-name:var(--font-body)] text-[var(--color-gain)]">+4.85%</span>
        </div>
        <div className="p-6 bg-[var(--color-surface-1)] border border-[var(--color-border)] rounded-[var(--radius-panel)]">
          <p className="text-[13px] font-[family-name:var(--font-body)] text-[var(--color-text-secondary)] mb-1 uppercase tracking-wider">Total Return</p>
          <span className="text-[48px] font-[family-name:var(--font-display)] font-semibold leading-[1.1] text-[var(--color-gain)]">+5.24%</span>
        </div>
      </section>
    </main>
  )
}
