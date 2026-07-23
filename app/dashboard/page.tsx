'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const [executionMode, setExecutionMode] = useState('recommend')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/user/settings')
      .then(async (res) => {
        if (res.status === 401) {
          router.push('/login')
          return
        }
        const data = await res.json()
        if (data.execution_mode) {
          setExecutionMode(data.execution_mode)
        }
      })
      .catch(() => {
        // Keep default on error
      })
      .finally(() => {
        setLoading(false)
      })
  }, [router])

  const handleExecutionModeChange = async (newMode: string) => {
    setExecutionMode(newMode)
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ execution_mode: newMode })
      })
      if (!res.ok) {
        const data = await res.json()
        console.error('Failed to save execution mode:', data.error)
      }
    } catch (err) {
      console.error('Failed to save execution mode:', err)
    }
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Execution Mode</h2>
        <div className="flex gap-2">
          <button
            onClick={() => handleExecutionModeChange('auto')}
            className={`px-4 py-2 rounded ${
              executionMode === 'auto'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => handleExecutionModeChange('recommend')}
            className={`px-4 py-2 rounded ${
              executionMode === 'recommend'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            Recommend
          </button>
        </div>
      </div>
    </div>
  )
}