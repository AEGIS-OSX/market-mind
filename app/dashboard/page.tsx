import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', user.id)

  const { data: signals } = await supabase
    .from('signals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const totalValue = (positions ?? []).reduce(
    (sum, p) => sum + (p.quantity || 0) * (p.current_price || p.avg_cost || 0),
    0
  )

  const totalReturn = (positions ?? []).reduce((sum, p) => {
    const cost = (p.quantity || 0) * (p.avg_cost || 0)
    const value = (p.quantity || 0) * (p.current_price || p.avg_cost || 0)
    return sum + (value - cost)
  }, 0)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Portfolio Value</h3>
          <p className="text-2xl font-bold mt-2">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Return</h3>
          <p className={`text-2xl font-bold mt-2 ${totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalReturn >= 0 ? '+' : ''}
            ${totalReturn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Active Signals</h3>
          <p className="text-2xl font-bold mt-2">{(signals ?? []).length}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Signals</h2>
          <Link href="/dashboard/signals" className="text-sm text-blue-600 hover:text-blue-800">
            View all
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {(signals ?? []).length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              No signals yet. They will appear here when generated.
            </div>
          )}
          {(signals ?? []).map((signal) => (
            <div key={signal.id} className="px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-medium">{signal.symbol}</p>
                <p className="text-sm text-gray-500">{signal.signal_type}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">{(signal.confidence * 100).toFixed(0)}% confidence</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
