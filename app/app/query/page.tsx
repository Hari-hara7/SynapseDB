"use client"

import { useState } from 'react'

export default function QueryPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!query) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error || 'Query failed')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Run a Natural Language Query</h1>

      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask something..."
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? 'Searching...' : 'Run Query'}
        </button>
      </div>

      {error && <div className="text-red-600 mt-4">{error}</div>}

      {result && (
        <div className="mt-4">
          <h2 className="font-semibold">Result</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
