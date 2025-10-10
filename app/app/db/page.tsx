"use client"

import { useMemo, useState } from "react"
import { ArrowRight, Database, Plug, ShieldCheck, Table2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardGradient } from "@/components/ui/card"

type SchemaMap = Record<string, string[]>

const quickStarts = [
  "postgres://postgres:password@localhost:5432/postgres?schema=public",
  "postgresql://user:pass@db.internal:5432/analytics?schema=data_edge",
  "postgres://readonly:secret@supabase.co:6543/synapse?schema=hr",
]

export default function DBPage() {
  const [connectionString, setConnectionString] = useState("")
  const [loading, setLoading] = useState(false)
  const [schema, setSchema] = useState<SchemaMap | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleConnect = async () => {
    if (!connectionString) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/db", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionString }),
      })
      const data = await res.json()
      if (res.ok) setSchema(data.schema || {})
      else setError(data.error || "Failed to fetch schema")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const schemaEntries = useMemo(() => Object.entries(schema ?? {}), [schema])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <div className="absolute left-[-15%] top-[-20%] h-[460px] w-[460px] rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="absolute bottom-[-25%] right-[-20%] h-[520px] w-[520px] rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 pb-20 pt-12 sm:px-10">
        <header className="space-y-4">
          <Badge className="border-white/20 bg-white/10 text-white/70">Postgres ingestion</Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Securely inspect your warehouse schema in seconds.
            </h1>
            <p className="max-w-3xl text-sm text-white/60">
              SynapseDB connects over TLS, introspects schemas, and primes your hybrid AI pipelines with clean metadata. Bring your own connection string or start from a template.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/10 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.3em] text-white/40">Connection string</label>
                <Input
                  value={connectionString}
                  onChange={(event) => setConnectionString(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && handleConnect()}
                  placeholder="postgres://user:pass@host:5432/db?schema=public"
                />
                <p className="text-xs text-white/40">Credentials are encrypted in transit and never stored.</p>
              </div>

              <div className="flex flex-wrap gap-3">
                {quickStarts.map((sample) => (
                  <button
                    key={sample}
                    onClick={() => setConnectionString(sample)}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-white/70 transition hover:border-white/25 hover:bg-white/10"
                  >
                    {sample.replace(/:\/\/([^:@]+):[^@]+@/, "://$1:••••@")}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleConnect}
                  disabled={loading || !connectionString}
                  className="h-11 min-w-[180px] bg-white text-black hover:bg-white/90"
                >
                  {loading ? "Connecting…" : "Connect & introspect"}
                </Button>
                {schemaEntries.length > 0 && (
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                    {schemaEntries.length} tables detected
                  </span>
                )}
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/15 p-4 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="grid gap-3 text-sm text-white/65 sm:grid-cols-3">
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="rounded-full border border-white/15 bg-white/10 p-2 text-white/70">
                    <Plug className="size-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Direct connections</p>
                    <p className="text-xs text-white/50">Bring any Postgres flavor—Supabase, Neon, AlloyDB.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="rounded-full border border-white/15 bg-white/10 p-2 text-white/70">
                    <ShieldCheck className="size-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Least privilege</p>
                    <p className="text-xs text-white/50">Read-only roles supported out of the box for safety.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="rounded-full border border-white/15 bg-white/10 p-2 text-white/70">
                    <Table2 className="size-4" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Smart sampling</p>
                    <p className="text-xs text-white/50">We preview row counts to guide embedding budgets.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardGradient />
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3 text-white/80">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5">
                  <Database className="size-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">How it works</p>
                  <p className="text-xs text-white/50">Three quick steps to operationalize your schema.</p>
                </div>
              </div>

              <ol className="space-y-3 text-sm text-white/60">
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="font-semibold text-white">1. Connect securely</span>
                  <p className="text-xs text-white/50">We negotiate TLS and limit traffic to metadata inspection.</p>
                </li>
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="font-semibold text-white">2. Discover schemas</span>
                  <p className="text-xs text-white/50">Tables, columns, and types are normalized for prompting.</p>
                </li>
                <li className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="font-semibold text-white">3. Sync to Hybrid query</span>
                  <p className="text-xs text-white/50">Blend structured columns with vector search in minutes.</p>
                </li>
              </ol>

              <Button
                asChild
                variant="secondary"
                className="w-full justify-center border border-white/20 bg-white/5 text-white hover:bg-white/10"
              >
                <a href="/hybrid" className="inline-flex items-center gap-2">
                  Continue to Hybrid console
                  <ArrowRight className="size-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Schema preview</h2>
            <Badge className="border-white/20 bg-white/10 text-white/60">
              {schemaEntries.length > 0 ? `${schemaEntries.length} tables` : "Awaiting connection"}
            </Badge>
          </div>

          {schemaEntries.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-2">
              {schemaEntries.map(([table, columns]) => (
                <Card key={table} className="border-white/10 bg-white/[0.02]">
                  <CardGradient />
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/40">
                      <span>{table}</span>
                      <span>{columns.length} columns</span>
                    </div>
                    <ul className="grid gap-2 text-sm text-white/75">
                      {columns.map((column, index) => (
                        <li
                          key={`${table}-${column}-${index}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
                        >
                          {column}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-center text-sm text-white/50">
              Connect to a database to visualize table structures, column types, and relationships.
            </div>
          )}
        </section>

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-8 text-xs uppercase tracking-[0.3em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>SynapseDB never persists your credentials</span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-3" /> SOC2-aligned workflows
          </span>
        </footer>
      </div>
    </div>
  )
}
