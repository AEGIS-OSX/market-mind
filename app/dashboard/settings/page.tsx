'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const router = useRouter()
  const [riskLevel, setRiskLevel] = useState('moderate')
  const [investmentCap, setInvestmentCap] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [initialState, setInitialState] = useState({ riskLevel: 'moderate', investmentCap: null as number | null })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [connectionMessage, setConnectionMessage] = useState('')

  useEffect(() => {
    fetch('/api/user/settings')
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        const data = await res.json()
        setRiskLevel(data.risk_level || 'moderate')
        setInvestmentCap(data.investment_cap ?? null)
        setIsConnected(data.brokerage_connected || false)
        setInitialState({
          riskLevel: data.risk_level || 'moderate',
          investmentCap: data.investment_cap ?? null
        })
      })
      .catch(() => {
        setErrorMessage('Failed to load settings')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [router])

  const handleSave = async () => {
    setSaving(true)
    setErrorMessage('')
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          risk_level: riskLevel,
          investment_cap: investmentCap
        })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save settings')
      }
      const data = await res.json()
      setInitialState({
        riskLevel: data.risk_level,
        investmentCap: data.investment_cap
      })
    } catch (err: any) {
      setErrorMessage(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleConnect = () => {
    setConnectionMessage('Brokerage connection is not yet implemented.')
  }

  const handleDisconnect = () => {
    setConnectionMessage('Brokerage connection is not yet implemented.')
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded">
          {errorMessage}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Risk Level</h2>
          <div className="flex gap-2">
            {['conservative', 'moderate', 'aggressive'].map((level) => (
              <button
                key={level}
                onClick={() => setRiskLevel(level)}
                className={`px-4 py-2 rounded ${
                  riskLevel === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Investment Cap</h2>
          <input
            type="number"
            value={investmentCap ?? ''}
            onChange={(e) => setInvestmentCap(e.target.value ? Number(e.target.value) : null)}
            placeholder="No cap"
            className="w-full px-4 py-2 border rounded"
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Brokerage Connection</h2>
          <div className="flex items-center gap-4">
            <span className={isConnected ? 'text-green-600' : 'text-gray-500'}>
              {isConnected ? 'Connected' : 'Not connected'}
            </span>
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 bg-red-100 text-red-700 rounded"
              >
                Disconnect
              </button>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Connect
              </button>
            )}
          </div>
          {connectionMessage && (
            <p className="mt-2 text-sm text-amber-600">{connectionMessage}</p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-green-600 text-white rounded disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}