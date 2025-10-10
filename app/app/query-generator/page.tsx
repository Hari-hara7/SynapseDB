"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardGradient } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  ArrowRight,
  ClipboardCheck,
  ClipboardCopy,
  Database,
  Loader2,
  MessageSquareQuote,
  Wand2,
} from "lucide-react"

const SAMPLE_PROMPTS: string[] = [
  "Calculate the year-over-year growth in headcount by department with percentage change",
  "Find employees who joined in the last 6 months and their managers, ordered by department",
  "Show the salary distribution across job titles with min, max, avg, and median values",
  "List departments with more than 10 employees and their average tenure in years",
  "Compare remote vs office employees grouped by performance rating and location",
]

function formatSQL(sql: string) {
  if (!sql) return ""

  const cleaned = sql.replace(/\s+/g, " ").trim()

  const withBreaks = cleaned.replace(
    /\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL OUTER JOIN|FULL JOIN|CROSS JOIN|UNION ALL|UNION|ON|AND|OR)\b/gi,
    (match) => `\n${match.toUpperCase()}`,
  )

  return withBreaks
    .replace(/^[\n\s]+/, "")
    .replace(/\n(AND|OR)\b/g, "\n  $1")
    .replace(/\nON\b/g, "\n  ON")
    .replace(/\n(JOIN|INNER JOIN|LEFT JOIN|RIGHT JOIN|FULL OUTER JOIN|FULL JOIN|CROSS JOIN)\b/g, "\n  $1")
    .trim()
}

export default function QueryGeneratorPage() {
  const searchParams = useSearchParams()

  const [question, setQuestion] = useState("List the top 5 highest-paid employees in Sales")
  const [sql, setSql] = useState("")
  const [params, setParams] = useState<any[]>([])
  const [notes, setNotes] = useState<string[]>([])
  const [table, setTable] = useState<string | undefined>(undefined)
  const [usedGemini, setUsedGemini] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const formattedSql = useMemo(() => formatSQL(sql), [sql])

  // Prefill from URL
  useEffect(() => {
    const prompt = searchParams.get("prompt")
    if (prompt) setQuestion(prompt)
  }, [searchParams])

  const resetState = () => {
    setSql("")
    setParams([])
    setNotes([])
    setTable(undefined)
    setUsedGemini(false)
    setError(null)
    setCopied(false)
  }

  const handleGenerate = useCallback(async () => {
    if (!question.trim()) {
      setError("Ask a question first")
      return
    }

    setLoading(true)
    setError(null)
    setSql("")
    setParams([])
    setNotes([])
    setTable(undefined)
    setUsedGemini(false)
    setCopied(false)

    try {
      const res = await fetch("/api/advanced-nl-sql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, execute: false, limit: 100 }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || "Failed to generate SQL")
      }

      setSql(data.sql || "")
      setParams(Array.isArray(data.params) ? data.params : [])
      setNotes(Array.isArray(data.notes) ? data.notes : [])
      setTable(typeof data.table === "string" ? data.table : undefined)
      setUsedGemini(Boolean(data.usedGemini))

      if (data.error) setError(data.error)
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
        <div className="absolute bottom-[-30%] right-[-12%] h-[520px] w-[520px] rounded-full bg-emerald-500/25 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-12 sm:px-10">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="border-white/20 bg-white/10 text-white/70">SQL Generator</Badge>
            <span className="text-xs text-white/40">•</span>
            <Link href="/query-executor" className="text-xs text-white/60 hover:text-white">
              Switch to Query Executor →
            </Link>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">Generate production-ready SQL from plain language.</h1>
            <p className="max-w-3xl text-sm text-white/60">
              Powered by Gemini Flash with full schema awareness. Preview sanitized, parameterized SELECT statements with intelligent table selection, JOINs, and aggregations.
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
                      void handleGenerate()
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
                <Button onClick={handleGenerate} disabled={loading} className="h-11 min-w-[150px] bg-white text-black hover:bg-white/90">
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Generating…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Wand2 className="size-4" /> Generate SQL
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
                    <p className="text-lg font-semibold text-white">Generated SQL</p>
                    <p className="text-xs text-white/50">
                      {usedGemini ? "✨ Gemini Flash powered" : "Preview only—not executed"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {usedGemini && (
                    <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
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
                <pre className="max-h-[280px] overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-white/80 whitespace-pre-wrap">{formattedSql}</pre>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-sm text-white/50">
                  Generate to preview sanitized SQL with prepared parameters. Mutating statements are blocked.
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
            </CardContent>
          </Card>
        </section>

        {sql && (
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardGradient />
            <CardContent className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">Ready to execute this query?</p>
                <p className="text-xs text-white/60">Run it safely with full result preview on the Query Executor page.</p>
              </div>
              <Button asChild className="bg-emerald-600 text-white hover:bg-emerald-700">
                <Link href={`/query-executor?prompt=${encodeURIComponent(question)}`} className="inline-flex items-center gap-2">
                  Execute Query
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-8 text-xs uppercase tracking-[0.3em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>SQL Generator • Preview mode • {new Date().getFullYear()}</span>
          <span className="flex items-center gap-2">
            <MessageSquareQuote className="size-3" /> SynapseDB on-device inference
          </span>
        </footer>
      </div>
    </div>
  )
}
