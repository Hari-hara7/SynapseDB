"use client"

import { useState } from 'react'

export default function DBPage() {
  const [connectionString, setConnectionString] = useState('')
  const [loading, setLoading] = useState(false)
  const [schema, setSchema] = useState<Record<string, string[]> | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString }),
      })
      const data = await res.json()
      if (res.ok) setSchema(data.schema || {})
      else setError(data.error || 'Failed to fetch schema')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Connect to Postgres</h1>

      <div className="mb-4">
        <input
          type="text"
          value={connectionString}
          onChange={(e) => setConnectionString(e.target.value)}
          placeholder="postgres://user:pass@host:5432/db?schema=public"
          className="w-full border rounded p-2"
        />
      </div>

      <div className="mb-6">
        <button
          onClick={handleConnect}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Connecting...' : 'Connect & Inspect'}
        </button>
      </div>

      {error && <div className="text-red-600 mb-4">{error}</div>}

      {schema && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Schema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(schema).map(([table, cols]) => (
              <div key={table} className="border rounded p-3">
                <h3 className="font-semibold">{table}</h3>
                <ul className="text-sm mt-2 list-disc list-inside">
                  {cols.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
