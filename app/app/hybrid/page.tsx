"use client"

import { useMemo, useState } from "react"
import {
  ArrowUpRight,
  ClipboardCheck,
  ClipboardCopy,
  Database,
  FileText,
  Layers,
  Loader2,
  Search,
  Sparkles,
  TableProperties,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardGradient } from "@/components/ui/card"

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

const MODES: Array<{ value: "hybrid" | "structured" | "documents"; label: string; description: string }> = [
  { value: "hybrid", label: "Hybrid", description: "Blend SQL + Policies" },
  { value: "structured", label: "Structured", description: "Database only" },
  { value: "documents", label: "Documents", description: "Policies & Notes" },
]

export default function HybridQueryPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [structuredResults, setStructuredResults] = useState<StructuredResult[]>([])
  const [documentResults, setDocumentResults] = useState<DocumentResult[]>([])
  const [responseTime, setResponseTime] = useState<string | null>(null)
  const [mode, setMode] = useState<"hybrid" | "structured" | "documents">("hybrid")
  const [error, setError] = useState<string | null>(null)
  const [classification, setClassification] = useState<string | null>(null)
  const [generatedSQL, setGeneratedSQL] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [documentWarning, setDocumentWarning] = useState<string | null>(null)

  const hasStructured = structuredResults.length > 0
  const hasDocuments = documentResults.length > 0

  const hasStructuredError = structuredResults.some((row) => row?.error)

  const structuredColumns = useMemo(() => {
    if (!hasStructured || hasStructuredError) return []
    return Object.keys(structuredResults[0] ?? {})
  }, [hasStructured, structuredResults, hasStructuredError])

  const handleCopySQL = async () => {
    if (!generatedSQL) return
    await navigator.clipboard.writeText(generatedSQL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleQuery = async () => {
    if (!query) return
    setLoading(true)
    setError(null)
    setClassification(null)
    setGeneratedSQL(null)
    setStructuredResults([])
    setDocumentResults([])
    setResponseTime(null)
    setDocumentWarning(null)

    try {
      const res = await fetch("/api/hybrid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, mode }),
      })
      const data = await res.json()

      if (res.ok) {
        setStructuredResults(data.structured_results || [])
        setDocumentResults(data.document_results || [])
        setResponseTime(data.response_time || null)
        setClassification(data.type || null)
        setGeneratedSQL(data.sql || null)
        setDocumentWarning(data.document_warning || null)
      } else {
        setError(data.error || "Unknown error")
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute left-[-20%] top-[-30%] h-[440px] w-[440px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-25%] right-[-10%] h-[520px] w-[520px] rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-12 sm:px-10">
        <header className="space-y-5">
          <Badge className="border-white/20 bg-white/10 text-white/80">Hybrid AI Query Console</Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Ask complex employee questions, get explainable answers in seconds.
            </h1>
            <p className="max-w-2xl text-sm text-white/60">
              SynapseDB fuses natural language SQL, document embeddings, and policy context to deliver holistic insights.
              Toggle modes to stay in compliance or broaden to unstructured knowledge.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/15 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-4">
                <label className="text-xs uppercase tracking-[0.3em] text-white/40">Question</label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="e.g. Compare headcount by department vs last quarter"
                    className="flex-1"
                  />
                  <Button
                    onClick={handleQuery}
                    disabled={loading}
                    className="h-11 min-w-[140px] bg-white text-black hover:bg-white/90"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Searching…
                      </span>
                    ) : (
                      "Run query"
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {MODES.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMode(m.value)}
                    className={`group flex h-11 items-center gap-2 rounded-full border px-5 text-sm transition ${
                      mode === m.value
                        ? "border-white/25 bg-white/15 text-white"
                        : "border-white/15 bg-white/5 text-white/60 hover:border-white/25 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span>{m.label}</span>
                    <span className="text-xs text-white/40 group-hover:text-white/60">{m.description}</span>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 text-sm text-white/60 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Database className="size-4 text-white/70" />
                  <div>
                    <p className="font-medium text-white">Schema-aware SQL</p>
                    <p className="text-xs text-white/50">Auto validates read-only queries before execution.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <FileText className="size-4 text-white/70" />
                  <div>
                    <p className="font-medium text-white">Document grounding</p>
                    <p className="text-xs text-white/50">Embeddings surface policy snippets for richer context.</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/40">
                {responseTime && (
                  <span className="inline-flex items-center gap-2">
                    <Sparkles className="size-3" /> Response {responseTime}
                  </span>
                )}
                {classification && (
                  <span className="inline-flex items-center gap-2">
                    Mode {classification}
                  </span>
                )}
              </div>
              {error && <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardGradient />
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/80">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                    <Search className="size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">Suggested prompts</p>
                    <p className="text-xs text-white/50">Tap to auto-fill and run</p>
                  </div>
                </div>
                <Badge className="border-white/20 bg-white/10 text-white/60">Live schema</Badge>
              </div>

              <div className="space-y-2 text-sm text-white/70">
                {["Who is eligible for the Q4 retention bonus?", "List employees with upcoming performance reviews", "Compare average tenure across departments"].map(
                  (prompt) => (
                    <button
                      key={prompt}
                      onClick={() => setQuery(prompt)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-white/20 hover:bg-white/10"
                    >
                      {prompt}
                    </button>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-white/10 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                    <TableProperties className="size-5" />
                  </div>
                  <h2 className="text-xl font-semibold">Structured results</h2>
                </div>
                <Badge className="border-white/20 bg-white/10 text-white/60">
                  {loading && mode !== "documents"
                    ? "Fetching…"
                    : hasStructured
                      ? `${structuredResults.length} row${structuredResults.length === 1 ? "" : "s"}`
                      : hasStructuredError
                        ? "Error"
                        : "No data"}
                </Badge>
              </div>

              {hasStructuredError ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/15 p-5 text-sm text-red-200">
                  {structuredResults[0].error}
                  {structuredResults[0].details && (
                    <p className="mt-2 text-xs text-red-100/80">{structuredResults[0].details}</p>
                  )}
                </div>
              ) : hasStructured ? (
                <div className="space-y-4">
                  {generatedSQL && (
                    <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
                        <span>Generated SQL</span>
                        <button
                          onClick={handleCopySQL}
                          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-white/60 transition hover:border-white/25 hover:text-white"
                        >
                          {copied ? (
                            <>
                              <ClipboardCheck className="size-3" /> Copied
                            </>
                          ) : (
                            <>
                              <ClipboardCopy className="size-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs text-white/70">{generatedSQL}</pre>
                    </div>
                  )}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-2">
                    <div className="max-h-[420px] overflow-x-auto">
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
                                <td key={col} className="whitespace-nowrap px-4 py-3 text-sm text-white/80">
                                  {String(row[col])}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-white/50">
                  Run a query to see structured employee metrics, compensation summaries, headcount snapshots, and more.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                    <Layers className="size-5" />
                  </div>
                  <h2 className="text-xl font-semibold">Document context</h2>
                </div>
                <Badge className="border-white/20 bg-white/10 text-white/60">
                  {documentWarning
                    ? "Unavailable"
                    : loading && mode !== "structured"
                      ? "Fetching…"
                      : hasDocuments
                        ? `${documentResults.length} match${documentResults.length === 1 ? "" : "es"}`
                        : "Awaiting"}
                </Badge>
              </div>

              {documentWarning ? (
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-100">
                  {documentWarning}
                </div>
              ) : hasDocuments ? (
                <div className="space-y-3 text-sm text-white/70">
                  {documentResults.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
                        <span>{doc.filename}</span>
                        <span>Distance {doc.distance.toFixed(4)}</span>
                      </div>
                      <p className="mt-3 text-white/80">{doc.snippet}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-sm text-white/50">
                  Upload policy manuals, handbooks, and notes to enrich every SQL answer with qualitative guidance.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-8 text-xs uppercase tracking-[0.3em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>Hybrid query runtime secured • {new Date().getFullYear()}</span>
          <span className="flex items-center gap-2">
            <Sparkles className="size-3" /> SynapseDB orchestrates Gemini + pgvector
          </span>
        </footer>
      </div>
    </div>
  )
}
