"use client"

import { useMemo, useState } from "react"
import { ArrowUpRight, FileText, Search, Sparkles, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardGradient } from "@/components/ui/card"

interface QueryResponse {
  query: string
  count: number
  response_time: string
  results: Array<{
    id: string
    filename: string
    content: string
    uploadedAt?: string
  }>
}

const suggestions = [
  "Show policy about remote work stipend",
  "Find documents mentioning performance improvement plan",
  "Summaries of onboarding checklist",
]

export default function QueryPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!query) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error || "Query failed")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const formattedResults = useMemo(() => result?.results ?? [], [result])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute left-[-20%] top-[-25%] h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-35%] right-[-15%] h-[520px] w-[520px] rounded-full bg-indigo-500/30 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 pb-20 pt-12 sm:px-10">
        <header className="space-y-4">
          <Badge className="border-white/20 bg-white/10 text-white/80">Document intelligence</Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Find policy answers inside employee docs instantly.
            </h1>
            <p className="max-w-2xl text-sm text-white/60">
              Search high-signal snippets across manuals, handbooks, and meeting notes. SynapseDB highlights the exact clauses you need backed by embeddings.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-white/15 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <label className="text-xs uppercase tracking-[0.3em] text-white/40">Search prompt</label>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  placeholder="e.g. policy for sabbatical eligibility"
                />
              </div>
              <div className="flex flex-wrap gap-3 text-sm text-white/70">
                {suggestions.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setQuery(prompt)}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 transition hover:border-white/25 hover:bg-white/10"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !query}
                  className="h-11 min-w-[140px] bg-white text-black hover:bg-white/90"
                >
                  {loading ? "Searching…" : "Search"}
                </Button>
                {result && (
                  <span className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/40">
                    <Sparkles className="size-3" /> Search completed in {result.response_time}
                  </span>
                )}
              </div>
              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}
              <div className="grid gap-3 text-sm text-white/60 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Search className="size-4 text-white/70" />
                  <div>
                    <p className="font-medium text-white">Semantic ranking</p>
                    <p className="text-xs text-white/50">Harnesses embeddings tuned for policy language.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <Wand2 className="size-4 text-white/70" />
                  <div>
                    <p className="font-medium text-white">Plain language prompts</p>
                    <p className="text-xs text-white/50">No syntax required—type questions like you speak.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardGradient />
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-white/80">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                    <FileText className="size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">Recent context</p>
                    <p className="text-xs text-white/50">Keep your prompts grounded</p>
                  </div>
                </div>
                <Badge className="border-white/20 bg-white/10 text-white/60">Auto updated</Badge>
              </div>

              <div className="space-y-3 text-sm text-white/60">
                <p>• Upload .txt or .md versions of policies for best results.</p>
                <p>• Chunking keeps snippets focused and latency low.</p>
                <p>• Need structured answers? Blend with Hybrid Query.</p>
              </div>

              <Button
                asChild
                variant="secondary"
                className="w-full justify-center border border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <a href="/ingestion" className="inline-flex items-center gap-2">
                  Upload more sources
                  <ArrowUpRight className="size-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Search results</h2>
            <Badge className="border-white/20 bg-white/10 text-white/60">
              {result ? `${result.count} hits` : "Awaiting query"}
            </Badge>
          </div>

          {result ? (
            formattedResults.length > 0 ? (
              <div className="space-y-4">
                {formattedResults.map((doc) => (
                  <Card key={doc.id} className="border-white/10 bg-white/[0.02]">
                    <CardGradient />
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-white/40">
                        <span>{doc.filename}</span>
                        {doc.uploadedAt && (
                          <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      <p className="text-sm text-white/80 whitespace-pre-wrap">{doc.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center text-sm text-white/50">
                No documents found matching “{result.query}”. Try synonyms or broaden the scope.
              </div>
            )
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center text-sm text-white/50">
              Run a search to see highlighted handbook excerpts and policy language.
            </div>
          )}
        </section>

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-8 text-xs uppercase tracking-[0.3em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>Document search powered by SynapseDB embeddings</span>
          <span className="flex items-center gap-2">
            <Sparkles className="size-3" /> {new Date().getFullYear()}
          </span>
        </footer>
      </div>
    </div>
  )
}
