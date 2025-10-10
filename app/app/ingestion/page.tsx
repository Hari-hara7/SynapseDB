"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  Check,
  Database,
  ExternalLink,
  Link2,
  Network,
  PlugZap,
  Rows2,
  Wand2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardGradient } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

const sampleConnections = [
  "postgresql://readonly:secret@analytics.internal:5432/people_ops?schema=public",
  "postgresql://bot:password@neon.tech:5432/hr_lake?schema=talent",
  "postgresql://ai_reader:******@supabase.co:6543/synapse?schema=policies",
]

export default function IngestionPage() {
  const [connectionString, setConnectionString] = useState("")
  const [loading, setLoading] = useState(false)
  const [schema, setSchema] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null)
  const [suggestionsLimit, setSuggestionsLimit] = useState<number>(10)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const tables = useMemo(() => (schema ? Object.values(schema.tables) : []), [schema])

  const handleConnect = async () => {
    if (!connectionString) {
      setError("Please enter a connection string")
      return
    }

    setLoading(true)
    setError(null)
    setSchema(null)

    try {
      const res = await fetch("/api/connect-db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString }),
      })

      const data = await res.json()

      if (data.success) {
        setSchema(data.schema)
        setConnected(true)
        setSuggestions([])
        setSuggestionsError(null)
      } else {
        setError(data.details || data.error || "Connection failed")
      }
    } catch (e: any) {
      setError(`Network error: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateSuggestions = async () => {
    if (!schema) return
    setSuggestionsLoading(true)
    setSuggestionsError(null)
    try {
      const res = await fetch("/api/suggest-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema, limit: suggestionsLimit }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
      } else {
        setSuggestions([])
        setSuggestionsError(data.details || data.error || "Failed to generate suggestions")
      }
    } catch (e: any) {
      setSuggestions([])
      setSuggestionsError(e.message)
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      setTimeout(() => setCopiedIndex(null), 1500)
    } catch (err) {
      console.error("Copy failed", err)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute left-[-10%] top-[-20%] h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-30%] right-[-5%] h-[520px] w-[520px] rounded-full bg-purple-500/30 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-14 px-6 pb-20 pt-12 sm:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-white/70">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/80 transition hover:border-white/25 hover:bg-white/10"
            >
              <ArrowUpRight className="size-4 rotate-180" /> Back to Hub
            </Link>
            {connected && (
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-emerald-500/10 px-4 py-2 text-emerald-300">
                <Check className="size-4" /> Connected
              </span>
            )}
          </div>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">
            ingest · discover · enrich
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/15 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="space-y-8">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Badge className="border-white/20 bg-white/10 text-white/80">SynapseDB Pipeline</Badge>
                  <h1 className="text-3xl font-semibold tracking-tight">
                    Wire your data warehouse in under a minute.
                  </h1>
                  <p className="max-w-xl text-sm text-white/60">
                    Drop in a PostgreSQL URL, introspect tables instantly, then use AI-generated prompts to explore your employee landscape.
                  </p>
                </div>
                <div className="hidden items-center justify-center rounded-2xl border border-white/15 bg-white/5 p-4 text-white/70 sm:flex">
                  <PlugZap className="size-8" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-xs uppercase tracking-[0.25em] text-white/40">
                  PostgreSQL connection string
                </label>
                <Input
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  placeholder="postgresql://user:password@host:5432/database"
                />
                <div className="flex flex-wrap gap-3 text-xs text-white/50">
                  {sampleConnections.map((sample) => (
                    <button
                      key={sample}
                      onClick={() => setConnectionString(sample)}
                      className="rounded-full border border-white/15 bg-white/5 px-4 py-2 transition hover:border-white/25 hover:bg-white/10 hover:text-white"
                      title="Click to paste this string"
                    >
                      {sample.replace(/:([^:@]+)@/, ":••••••@")}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-white/40">
                  Example: <span className="font-mono">postgresql://hrbot:secret@db.internal:5432/employeedb</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleConnect}
                  disabled={loading || !connectionString}
                  className="bg-white text-black hover:bg-white/90"
                >
                  {loading ? "Testing connection…" : "Test & Discover"}
                </Button>
                <Button
                  variant="secondary"
                  className="border border-white/20 bg-white/5 text-white hover:bg-white/10"
                  asChild
                >
                  <Link href="/upload-enhanced">Upload HR Documents</Link>
                </Button>
                {error && <span className="text-sm text-red-300">{error}</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardGradient />
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between text-sm text-white/60">
                <span className="inline-flex items-center gap-2">
                  <Database className="size-4" />
                  Connection insights
                </span>
                <span>{connected ? "Live" : "Waiting"}</span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Tables</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {schema ? schema.metadata.total_tables : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Relationships</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {schema ? schema.metadata.total_relationships : "—"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-white/60">
                <div className="flex items-center gap-3">
                  <Rows2 className="size-4" />
                  Smart schema discovery with index and PK metadata.
                </div>
                <div className="flex items-center gap-3">
                  <Link2 className="size-4" />
                  Relationship graphing for multi-table joins.
                </div>
                <div className="flex items-center gap-3">
                  <Wand2 className="size-4" />
                  AI-generated natural language prompts from your structure.
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {schema && (
          <section className="space-y-10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Discovered schema</h2>
                <p className="text-sm text-white/60">
                  {tables.length} tables introspected. Primary keys, indexes, and comments preserved for prompt engineering.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs uppercase tracking-[0.25em] text-white/40">
                  Suggestion count
                </label>
                <Input
                  type="number"
                  min={3}
                  max={25}
                  value={suggestionsLimit}
                  onChange={(e) =>
                    setSuggestionsLimit(Math.max(3, Math.min(25, Number(e.target.value) || 10)))
                  }
                  className="h-10 w-24"
                />
                <Button
                  onClick={handleGenerateSuggestions}
                  disabled={suggestionsLoading}
                  className="bg-white text-black hover:bg-white/90"
                >
                  {suggestionsLoading ? "Generating…" : "AI Suggestions"}
                </Button>
              </div>
            </div>

            {suggestionsError && (
              <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {suggestionsError}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <Card className="border-white/10 bg-white/[0.02]">
                <CardGradient />
                <CardContent className="space-y-6">
                  <div className="max-h-[480px] space-y-4 overflow-y-auto pr-2">
                    {tables.map((table: any) => (
                      <div
                        key={table.name}
                        className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-white">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/10">
                              <Network className="size-4" />
                            </div>
                            <div>
                              <p className="font-semibold">{table.name}</p>
                              <p className="text-xs text-white/40">
                                {table.columns.length} columns
                              </p>
                            </div>
                          </div>
                          {table.primary_keys.length > 0 && (
                            <Badge className="border-white/20 bg-white/10 text-white/70">
                              PK: {table.primary_keys.join(", ")}
                            </Badge>
                          )}
                        </div>

                        <div className="mt-4 space-y-2 text-white/70">
                          {table.columns.map((col: any) => (
                            <div
                              key={col.name}
                              className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-2 text-xs"
                            >
                              <span className="font-mono text-white/80">{col.name}</span>
                              <span className="text-white/60">
                                {col.type}
                                {col.max_length ? `(${col.max_length})` : ""}
                              </span>
                              <span className="text-white/40">
                                {col.nullable ? "NULL" : "NOT NULL"}
                              </span>
                            </div>
                          ))}
                        </div>

                        {table.indexes.length > 0 && (
                          <div className="mt-4 text-xs text-white/50">
                            <p className="uppercase tracking-[0.25em] text-white/30">Indexes</p>
                            <ul className="mt-2 space-y-1">
                              {table.indexes.map((idx: any) => (
                                <li key={idx.name} className="font-mono">• {idx.name}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {schema.relationships && schema.relationships.length > 0 && (
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                      <p className="text-xs uppercase tracking-[0.3em] text-white/40">Relationships</p>
                      <div className="mt-3 space-y-2 font-mono text-xs">
                        {schema.relationships.map((rel: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-white/70">
                            <span>{rel.from_table}.{rel.from_column}</span>
                            <ArrowUpRight className="size-3 rotate-45 text-white/30" />
                            <span>{rel.to_table}.{rel.to_column}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/[0.02]">
                <CardGradient />
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">AI query suggestions</h3>
                    <Badge className="border-white/20 bg-white/10 text-white/70">Gemini powered</Badge>
                  </div>

                  {suggestions.length > 0 ? (
                    <ul className="space-y-3 text-sm text-white/70">
                      {suggestions.map((s, i) => (
                        <li
                          key={i}
                          className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 transition hover:border-white/20 hover:bg-white/10"
                        >
                          <span>{s}</span>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="ghost"
                              className="h-8 rounded-full border border-white/15 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10"
                              onClick={() => copyToClipboard(s, i)}
                            >
                              {copiedIndex === i ? "Copied" : "Copy"}
                            </Button>
                            <Button
                              variant="ghost"
                              asChild
                              className="h-8 rounded-full border border-white/15 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10"
                            >
                              <Link href={{ pathname: "/hybrid", query: { prompt: s } }}>Open in Hybrid</Link>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm text-white/50">
                      Generate AI prompts tailored to your schema—perfect starters for Hybrid Query or automated dashboards.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/10 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-white">Query interface</h3>
                <p className="text-sm text-white/60">
                  Launch the hybrid console to blend SQL metrics with handbook context. Prompts you copy above will auto fill.
                </p>
              </div>
              <Button asChild className="bg-white text-black hover:bg-white/90">
                <Link href="/hybrid" className="inline-flex items-center gap-2">
                  Open Hybrid Console <ExternalLink className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-white">Document ingestion toolkit</h3>
                <p className="text-sm text-white/60">
                  Drag-and-drop uploads, chunked embeddings, and automatic policy enrichment live in the Upload workspace.
                </p>
              </div>
              <Button
                asChild
                className="border border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/upload-enhanced" className="inline-flex items-center gap-2">
                  Open Upload Studio <ArrowUpRight className="size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
