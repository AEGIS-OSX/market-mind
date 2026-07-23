import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function SignalsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: signals } = await supabase
    .from('signals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">Trading Signals</h2>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Confidence</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(signals ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  No signals yet. AI-generated signals will appear here.
                </td>
              </tr>
            )}
            {(signals ?? []).map((signal) => (
              <tr key={signal.id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{signal.symbol}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    signal.signal_type === 'buy' ? 'bg-green-100 text-green-800' :
                    signal.signal_type === 'sell' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {signal.signal_type}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{(signal.confidence * 100).toFixed(0)}%</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {signal.created_at ? new Date(signal.created_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
