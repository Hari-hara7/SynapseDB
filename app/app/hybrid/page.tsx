"use client"

import { useState } from 'react'

interface StructuredResult {
  [key: string]: any
}

interface DocumentResult {
  id: string
  filename: string
  snippet: string
  distance: number
  metadata?: any
}

export default function HybridQueryPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [structuredResults, setStructuredResults] = useState<StructuredResult[]>([])
  const [documentResults, setDocumentResults] = useState<DocumentResult[]>([])
  const [responseTime, setResponseTime] = useState<string | null>(null)
  const [mode, setMode] = useState<'hybrid' | 'structured' | 'documents'>('hybrid')
  const [error, setError] = useState<string | null>(null)

  const handleQuery = async () => {
    if (!query) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/hybrid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode }),
      })
      const data = await res.json()

      if (res.ok) {
        setStructuredResults(data.structured_results || [])
        setDocumentResults(data.document_results || [])
        setResponseTime(data.response_time || null)
      } else {
        setError(data.error || 'Unknown error')
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Hybrid Employee Query</h1>

      <div className="mb-4 flex flex-col md:flex-row gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask something about employees or documents..."
          className="flex-1 border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as any)}
          className="border rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="hybrid">Hybrid</option>
          <option value="structured">Structured DB</option>
          <option value="documents">Documents</option>
        </select>
        <button
          onClick={handleQuery}
          className="bg-blue-500 text-white rounded px-4 py-2 hover:bg-blue-600 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {responseTime && (
        <div className="mb-4 text-sm text-gray-600">Response time: {responseTime}</div>
      )}

      {error && <div className="mb-4 text-red-600 font-semibold">{error}</div>}

      {/* Structured Results */}
      {structuredResults.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Structured Results</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  {Object.keys(structuredResults[0]).map((col) => (
                    <th key={col} className="border px-3 py-1 text-left">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {structuredResults.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="border px-3 py-1">{String(val)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Results */}
      {documentResults.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-2">Document Results</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {documentResults.map((doc) => (
              <div key={doc.id} className="border rounded p-3 shadow hover:shadow-md transition">
                <h3 className="font-semibold">{doc.filename}</h3>
                <p className="text-sm mt-2">{doc.snippet}</p>
                <p className="text-xs text-gray-500 mt-1">Distance: {doc.distance.toFixed(4)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
