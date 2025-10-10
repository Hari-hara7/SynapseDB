"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardGradient } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  ClipboardCheck,
  ClipboardCopy,
  Database,
  Loader2,
  MessageSquareQuote,
  Play,
  TableProperties,
} from "lucide-react"

type Row = Record<string, any>

const SAMPLE_PROMPTS: string[] = [
  "Calculate the year-over-year growth in headcount by department with percentage change",
  "Find employees who joined in the last 6 months and their managers, ordered by department",
  "Show the salary distribution across job titles with min, max, avg, and median values",
  "List departments with more than 10 employees and their average tenure in years",
  "Compare remote vs office employees grouped by performance rating and location",
]

export default function QueryExecutorPage() {
  const searchParams = useSearchParams()

  const [question, setQuestion] = useState("List the top 5 highest-paid employees in Sales")
  const [sql, setSql] = useState("")
  const [params, setParams] = useState<any[]>([])
  const [results, setResults] = useState<Row[] | null>(null)
  const [notes, setNotes] = useState<string[]>([])
  const [table, setTable] = useState<string | undefined>(undefined)
  const [usedGemini, setUsedGemini] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [execError, setExecError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Prefill from URL
  useEffect(() => {
    const prompt = searchParams.get("prompt")
    if (prompt) setQuestion(prompt)
  }, [searchParams])

  // Keyboard shortcut: Ctrl/Cmd+Enter to Execute
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault()
        void handleExecute()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [question])

  const columns = useMemo(() => {
    if (!results || results.length === 0) return []
    return Object.keys(results[0] ?? {})
  }, [results])

  const resetState = () => {
    setSql("")
    setParams([])
    setResults(null)
    setNotes([])
    setTable(undefined)
    setUsedGemini(false)
    setError(null)
    setExecError(null)
    setCopied(false)
  }

  const handleExecute = useCallback(async () => {
    if (!question.trim()) {
      setError("Ask a question first")
      return
    }

    setLoading(true)
    setError(null)
    setExecError(null)
    setResults(null)
    setSql("")
    setParams([])
    setNotes([])
    setUsedGemini(false)
    setCopied(false)

    try {
      const res = await fetch("/api/advanced-nl-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, execute: true, limit: 100 }),
      })
      const data = await res.json()

      if (!res.ok && (!data || !data.results)) {
        throw new Error(data?.error || "Failed to execute query")
      }

      setSql(data.sql || "")
      setParams(Array.isArray(data.params) ? data.params : [])
      setNotes(Array.isArray(data.notes) ? data.notes : [])
      setResults(Array.isArray(data.results) ? data.results : null)
      setTable(typeof data.table === "string" ? data.table : undefined)
      setUsedGemini(Boolean(data.usedGemini))

      if (data.error && !data.results) setError(data.error)
      if (data.execError) setExecError(String(data.execError))
    } catch (err: any) {
      setError(err?.message || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }, [question])

  const copySQL = async () => {
    if (!sql) return
    await navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <div className="absolute left-[-18%] top-[-22%] h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-30%] right-[-12%] h-[520px] w-[520px] rounded-full bg-sky-500/25 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-12 sm:px-10">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="border-white/20 bg-white/10 text-white/70">Query Executor</Badge>
            <span className="text-xs text-white/40">•</span>
            <Link href="/query-generator" className="text-xs text-white/60 hover:text-white">
              Switch to SQL Generator →
            </Link>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Execute natural language queries and see live results.</h1>
            <p className="max-w-3xl text-sm text-white/60">
              Powered by Gemini Flash for intelligent SQL generation. Executes parameterized SELECT statements safely with full schema awareness, smart JOINs, and instant results.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/15 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.3em] text-white/40">Employee question</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                      e.preventDefault()
                      void handleExecute()
                    }
                  }}
                  placeholder="e.g. What is the average tenure for technical roles hired in 2022?"
                  className="w-full min-h-[120px] rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/80 outline-none transition focus:border-white/20 focus:bg-white/10"
                />
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-white/70">
                {SAMPLE_PROMPTS.map((p) => (
                  <button key={p} onClick={() => setQuestion(p)} className="rounded-full border border-white/15 bg-white/5 px-4 py-2 transition hover:border-white/25 hover:bg-white/10">
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleExecute} disabled={loading} className="h-11 min-w-[150px] bg-white text-black hover:bg-white/90">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Executing…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Play className="size-4" /> Execute Query
                    </span>
                  )}
                </Button>
                <Button onClick={resetState} disabled={loading} variant="ghost" className="border border-white/15 bg-white/5 text-white hover:bg-white/10">
                  Reset
                </Button>
                {error && (
                  <span className="inline-flex items-center gap-2 text-xs text-red-300">
                    <AlertTriangle className="size-3" /> {error}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardGradient />
            <CardContent className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/80">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                    <Database className="size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">Executed SQL</p>
                    <p className="text-xs text-white/50">
                      {usedGemini ? "✨ AI-powered & audited" : "Safe & audited"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {usedGemini && (
                    <Badge className="border-sky-500/30 bg-sky-500/10 text-sky-300">
                      AI Generated
                    </Badge>
                  )}
                  {table && <Badge className="border-white/20 bg-white/10 text-white">table: {table}</Badge>}
                  {sql && (
                    <button onClick={copySQL} className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/70 transition hover:border-white/25 hover:text-white">
                      {copied ? <ClipboardCheck className="size-3" /> : <ClipboardCopy className="size-3" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
              </div>

              {sql ? (
                <pre className="max-h-[200px] overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/80">{sql}</pre>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/50">
                  Execute a query to see the generated SQL and live results below.
                </div>
              )}

              {params.length > 0 && (
                <div className="space-y-2 text-xs text-white/65">
                  <p className="uppercase tracking-[0.3em] text-white/40">Parameters</p>
                  <div className="flex flex-wrap gap-2">
                    {params.map((param, idx) => (
                      <span key={`${idx}-${String(param)}`} className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white/70">
                        {JSON.stringify(param)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {notes.length > 0 && (
                <div className="space-y-2 text-xs text-white/65">
                  <p className="uppercase tracking-[0.3em] text-white/40">Notes</p>
                  <ul className="space-y-2">
                    {notes.map((note, idx) => (
                      <li key={`${note}-${idx}`} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {execError && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                  <strong className="mr-1">Execution error:</strong>
                  {execError}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="border-white/10 bg-white/[0.02]">
          <CardGradient />
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                  <TableProperties className="size-5" />
                </div>
                <h2 className="text-xl font-semibold">Result set</h2>
              </div>
              <Badge className="border-white/20 bg-white/10 text-white/60">
                {results && results.length ? `${results.length} row${results.length === 1 ? "" : "s"}` : loading ? "Awaiting" : "Empty"}
              </Badge>
            </div>

            {results && results.length > 0 && columns.length > 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                <div className="max-h-[420px] overflow-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-sm text-white/80">
                    <thead className="sticky top-0 bg-black/70 backdrop-blur">
                      <tr>
                        {columns.map((col) => (
                          <th key={col} className="whitespace-nowrap px-4 py-3 text-left text-xs uppercase tracking-[0.25em] text-white/40">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((row, idx) => (
                        <tr key={idx} className="rounded-xl border border-white/5 bg-white/5">
                          {columns.map((col) => (
                            <td key={`${idx}-${col}`} className="whitespace-nowrap px-4 py-3 text-sm text-white/80">
                              {String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-sm text-white/50">
                Execute a query to stream structured results. Datasets stay read-only, and you can blend them with document context via the Hybrid console.
              </div>
            )}
          </CardContent>
        </Card>

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-8 text-xs uppercase tracking-[0.3em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>Query Executor • Live results • {new Date().getFullYear()}</span>
          <span className="flex items-center gap-2">
            <MessageSquareQuote className="size-3" /> SynapseDB on-device inference
          </span>
        </footer>
      </div>
    </div>
  )
}
