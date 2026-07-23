import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PortfolioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const totalValue = (positions ?? []).reduce(
    (sum, p) => sum + (p.quantity || 0) * (p.current_price || p.avg_cost || 0),
    0
  )

  const totalCost = (positions ?? []).reduce(
    (sum, p) => sum + (p.quantity || 0) * (p.avg_cost || 0),
    0
  )

  const totalReturn = totalValue - totalCost
  const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
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
          <h3 className="text-sm font-medium text-gray-500">Return %</h3>
          <p className={`text-2xl font-bold mt-2 ${totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {totalReturnPercent >= 0 ? '+' : ''}
            {totalReturnPercent.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Positions</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Price</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(positions ?? []).length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No positions yet. Trades will appear here after execution.
                </td>
              </tr>
            )}
            {(positions ?? []).map((position) => {
              const marketValue = (position.quantity || 0) * (position.current_price || position.avg_cost || 0)
              const cost = (position.quantity || 0) * (position.avg_cost || 0)
              const ret = marketValue - cost
              const retPercent = cost > 0 ? (ret / cost) * 100 : 0
              return (
                <tr key={position.id}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{position.symbol}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{position.quantity}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${(position.avg_cost || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${(position.current_price || position.avg_cost || 0).toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">${marketValue.toFixed(2)}</td>
                  <td className={`px-6 py-4 whitespace-nowrap ${ret >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {ret >= 0 ? '+' : ''}${ret.toFixed(2)} ({retPercent.toFixed(2)}%)
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
