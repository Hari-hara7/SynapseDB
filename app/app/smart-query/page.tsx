"use client"

import { useCallback, useEffect, useMemo, useState, useRef } from "react"
import { Card, CardContent, CardGradient } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  Brain,
  Clock,
  Database,
  FileText,
  Layers,
  Loader2,
  Search,
  Sparkles,
  Zap,
} from "lucide-react"

type StructuredResult = Record<string, any>
type DocumentResult = {
  id: number
  content: string
  metadata: any
  similarity: number
}

type PerformanceMetrics = {
  total_time_ms: number
  classification_time_ms: number
  sql_generation_time_ms?: number
  sql_execution_time_ms?: number
  embedding_time_ms?: number
  document_search_time_ms?: number
  cache_hit: boolean
  query_type: 'structured' | 'document' | 'hybrid'
}

export default function SmartQueryInterface() {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [queryType, setQueryType] = useState<string | null>(null)
  const [sql, setSql] = useState<string | null>(null)
  const [structuredResults, setStructuredResults] = useState<StructuredResult[] | null>(null)
  const [documentResults, setDocumentResults] = useState<DocumentResult[] | null>(null)
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null)
  const [structuredError, setStructuredError] = useState<string | null>(null)
  const [documentWarning, setDocumentWarning] = useState<string | null>(null)

  const inputRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch suggestions on input change
  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      void fetchSuggestions(query)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const fetchSuggestions = async (partial: string) => {
    try {
      const res = await fetch("/api/query-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partial }),
      })
      const data = await res.json()
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
        setShowSuggestions(true)
      } else {
        setSuggestions([])
        setShowSuggestions(false)
      }
    } catch (err) {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const structuredColumns = useMemo(() => {
    if (!structuredResults || structuredResults.length === 0) return []
    return Object.keys(structuredResults[0])
  }, [structuredResults])

  const resetState = () => {
    setQueryType(null)
    setSql(null)
    setStructuredResults(null)
    setDocumentResults(null)
    setPerformance(null)
    setStructuredError(null)
    setDocumentWarning(null)
    setError(null)
  }

  const handleExecute = useCallback(async () => {
    if (!query.trim()) {
      setError("Enter a query first")
      return
    }

    setLoading(true)
    resetState()
    setShowSuggestions(false)

    try {
      const res = await fetch("/api/smart-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 100 }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Query execution failed")
      }

      setQueryType(data.query_type || null)
      setSql(data.sql || null)
      setStructuredResults(data.structured_results || null)
      setDocumentResults(data.document_results || null)
      setPerformance(data.performance || null)
      setStructuredError(data.structured_error || null)
      setDocumentWarning(data.document_warning || null)

      if (data.error) setError(data.error)
    } catch (err: any) {
      setError(err?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [query])

  const applySuggestion = (suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <div className="absolute left-[-18%] top-[-22%] h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-30%] right-[-12%] h-[520px] w-[520px] rounded-full bg-purple-500/25 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-12 px-6 pb-20 pt-12 sm:px-10">
        <header className="space-y-4">
          <Badge className="border-white/20 bg-white/10 text-white/70">
            <Sparkles className="mr-1.5 size-3" />
            AI-Powered Smart Query Interface
          </Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Ask anything. Get structured data, documents, or both.
            </h1>
            <p className="max-w-3xl text-sm text-white/60">
              Powered by Gemini Flash 2.0 for intelligent query classification, SQL generation, and semantic document search. Includes auto-suggestions and real-time performance metrics.
            </p>
          </div>
        </header>

        {/* Query Input Section */}
        <Card className="border-white/15 bg-white/[0.02]">
          <CardGradient />
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                <Brain className="size-3.5" />
                Natural Language Query
              </label>
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault()
                      void handleExecute()
                    }
                    if (e.key === "Escape") {
                      setShowSuggestions(false)
                    }
                  }}
                  placeholder="e.g., Show employees hired in 2024 with their benefits policy..."
                  className="w-full min-h-[100px] rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/80 outline-none transition focus:border-white/20 focus:bg-white/10"
                />

                {/* Auto-suggestions dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-2xl border border-white/15 bg-black/95 backdrop-blur-xl">
                    <div className="p-2 space-y-1">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => applySuggestion(suggestion)}
                          className="w-full rounded-xl px-4 py-3 text-left text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                        >
                          <div className="flex items-start gap-3">
                            <Sparkles className="mt-0.5 size-4 flex-shrink-0 text-purple-400" />
                            <span>{suggestion}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={handleExecute}
                disabled={loading}
                className="h-11 min-w-[150px] bg-white text-black hover:bg-white/90"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" /> Processing…
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Zap className="size-4" /> Execute Query
                  </span>
                )}
              </Button>
              <Button
                onClick={resetState}
                disabled={loading}
                variant="ghost"
                className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
              >
                Clear
              </Button>
              {error && (
                <span className="inline-flex items-center gap-2 text-xs text-red-300">
                  <AlertTriangle className="size-3" /> {error}
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        {performance && (
          <Card className="border-purple-500/20 bg-purple-500/5">
            <CardGradient />
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-purple-500/30 bg-purple-500/10">
                  <Clock className="size-5 text-purple-300" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Performance Metrics</h3>
                  <p className="text-xs text-white/50">Real-time query execution insights</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/40">Total Time</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{performance.total_time_ms}ms</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/40">Query Type</p>
                  <Badge className="mt-2 border-white/20 bg-white/10 text-white capitalize">
                    {performance.query_type}
                  </Badge>
                </div>

                {performance.sql_generation_time_ms && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wider text-white/40">SQL Generation</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{performance.sql_generation_time_ms}ms</p>
                  </div>
                )}

                {performance.sql_execution_time_ms && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wider text-white/40">SQL Execution</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{performance.sql_execution_time_ms}ms</p>
                  </div>
                )}

                {performance.embedding_time_ms && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wider text-white/40">Embedding</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{performance.embedding_time_ms}ms</p>
                  </div>
                )}

                {performance.document_search_time_ms && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-wider text-white/40">Doc Search</p>
                    <p className="mt-1 text-2xl font-semibold text-white">{performance.document_search_time_ms}ms</p>
                  </div>
                )}

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/40">Cache Status</p>
                  <Badge className={`mt-2 ${performance.cache_hit ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-white/20 bg-white/10 text-white/60'}`}>
                    {performance.cache_hit ? 'Hit' : 'Miss'}
                  </Badge>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-wider text-white/40">Classification</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{performance.classification_time_ms}ms</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Structured Results (Tables) */}
        {structuredResults && structuredResults.length > 0 && (
          <Card className="border-white/10 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                    <Database className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Structured Data Results</h2>
                    <p className="text-xs text-white/50">SQL query executed successfully</p>
                  </div>
                </div>
                <Badge className="border-white/20 bg-white/10 text-white/60">
                  {structuredResults.length} row{structuredResults.length === 1 ? '' : 's'}
                </Badge>
              </div>

              {sql && (
                <details className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <summary className="cursor-pointer text-xs uppercase tracking-wider text-white/60">
                    Generated SQL
                  </summary>
                  <pre className="mt-3 overflow-auto rounded-lg bg-black/40 p-3 text-xs text-white/80">
                    {sql}
                  </pre>
                </details>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                <div className="max-h-[500px] overflow-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm text-white/80">
                    <thead className="sticky top-0 bg-black/70 backdrop-blur">
                      <tr>
                        {structuredColumns.map((col) => (
                          <th key={col} className="whitespace-nowrap px-4 py-3 text-left text-xs uppercase tracking-[0.25em] text-white/40">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {structuredResults.map((row, idx) => (
                        <tr key={idx} className="rounded-xl border border-white/5 bg-white/5">
                          {structuredColumns.map((col) => (
                            <td key={`${idx}-${col}`} className="whitespace-nowrap px-4 py-3 text-sm text-white/80">
                              {String(row[col] ?? 'NULL')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {structuredError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                  <strong className="mr-1">Error:</strong>{structuredError}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Document Results (Cards) */}
        {documentResults && documentResults.length > 0 && (
          <Card className="border-white/10 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">Document Results</h2>
                    <p className="text-xs text-white/50">Semantic search with embeddings</p>
                  </div>
                </div>
                <Badge className="border-white/20 bg-white/10 text-white/60">
                  {documentResults.length} document{documentResults.length === 1 ? '' : 's'}
                </Badge>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {documentResults.map((doc) => (
                  <div key={doc.id} className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="border-white/20 bg-white/10 text-white/60">
                        ID: {doc.id}
                      </Badge>
                      <Badge className="border-green-500/30 bg-green-500/10 text-green-300">
                        {(doc.similarity * 100).toFixed(1)}% match
                      </Badge>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {doc.content}
                    </p>
                    {doc.metadata && (
                      <details className="text-xs text-white/50">
                        <summary className="cursor-pointer">Metadata</summary>
                        <pre className="mt-2 overflow-auto rounded-lg bg-black/40 p-2">
                          {JSON.stringify(doc.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>

              {documentWarning && (
                <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-3 text-xs text-yellow-200">
                  <strong className="mr-1">Warning:</strong>{documentWarning}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !structuredResults && !documentResults && !error && (
          <Card className="border-white/10 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-white/5">
                <Layers className="size-8 text-white/40" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-white">Ready to query</h3>
              <p className="mt-2 max-w-md text-sm text-white/60">
                Enter a natural language query above. The AI will automatically classify it as structured, document, or hybrid and execute accordingly.
              </p>
            </CardContent>
          </Card>
        )}

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-8 text-xs uppercase tracking-[0.3em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>Smart Query Interface • Gemini Flash 2.0 • {new Date().getFullYear()}</span>
          <span className="flex items-center gap-2">
            <Search className="size-3" /> AI-powered search & analytics
          </span>
        </footer>
      </div>
    </div>
  )
}
