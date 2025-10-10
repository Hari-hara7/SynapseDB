"use client"

import Link from "next/link"
import {
  ArrowUpRight,
  Database,
  Layers,
  Bot,
  UploadCloud,
  Search,
  ShieldCheck,
  Gauge,
  FileText,
  Sparkles,
  Network,
  Wand2,
  ClipboardCopy,
  TableProperties,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardGradient } from "@/components/ui/card"

const primaryLinks = [
   {
    title: "Data Ingestion Panel",
    description:
      "Connect any Postgres instance, introspect schemas, relationships, and indexes with one click.",
    href: "/ingestion",
    icon: Database,
  },
   {
    title: "Smart Query Interface",
    description:
      "AI-powered query interface with auto-suggestions, intelligent classification, and performance metrics. Ask anything in natural language.",
    href: "/smart-query",
    icon: Sparkles,
    badge: "New",
  },
  {
    title: "Production Query Pipeline",
    description:
      "Enterprise-grade query processing with AI classification, security validation, performance optimization, and intelligent caching.",
    href: "/query-pipeline",
    icon: Gauge,
    badge: "Production",
  },
 
 
  {
    title: "Enhanced Upload",
    description:
      "Drag, drop, and enrich documents with automatic chunking, batching, and realtime progress.",
    href: "/upload-enhanced",
    icon: UploadCloud,
    badge: "Drag & Drop",
  },
   {
    title: "Document Search",
    description: "Search handbooks, policies, and notes using embeddings tuned for fast recall.",
    href: "/query",
    icon: Search,
  },
    {
    title: "Database Inspector",
    description: "Browse tables, columns, indexes, and timestamped samples from your sources.",
    href: "/db",
    icon: Network,
  },
 {
  title: "Natural Language Query System",
  description:
    "Convert user questions into dynamic SQL queries that adapt to your database schema in real-time using Gemini Flash 2.5 and Prisma.",
  href: "/query-interface",
  icon: Database,
},

 

]

const strengths = [
  {
    icon: Sparkles,
    title: "Natural Language Intelligence",
    items: [
      "Realtime NL → SQL generation with guardrails",
      "Adaptive document ranking powered by embeddings",
      "Schema-aware prompt hints to keep queries accurate",
    ],
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-Ready Controls",
    items: [
      "SQL safety validation & read-only enforcement",
      "Granular auditing via QueryLog with response times",
      "Vector migrations and pgvector bootstrapping helpers",
    ],
  },
]

const performance = [
  {
    icon: Bot,
    title: "Autonomous Automations",
    description:
      "Gemini-powered agents classify intent, write SQL, and fuse structured answers with policy context—zero manual tuning required.",
  },
  {
    icon: Gauge,
    title: "Observability & Speed",
    description:
      "Built-in response timing, cache flags, and indexing helpers keep every search sub-second and inspectable.",
  },
]

const sqlGeneratorFeatures = [
  {
    icon: Wand2,
    title: "AI-Powered SQL Generation",
    description:
      "Gemini Flash analyzes your full schema and generates intelligent SELECT queries with JOINs, aggregations, and proper indexing hints.",
    href: "/query-generator",
  },
  {
    icon: ClipboardCopy,
    title: "Production-Ready Output",
    description:
      "Copy parameterized, sanitized SQL ready for BI dashboards, CI pipelines, or manual execution—no cleanup needed.",
    href: "/query-generator",
  },
  {
    icon: Database,
    title: "Schema-Aware Intelligence",
    description:
      "Understands relationships, data types, and nullable fields to generate optimal queries with proper type casting and null handling.",
    href: "/query-generator",
  },
]

const queryExecutorFeatures = [
  {
    icon: TableProperties,
    title: "Instant AI Execution",
    description:
      "Gemini generates and executes complex queries in seconds—aggregations, window functions, CTEs, and multi-table JOINs handled automatically.",
    href: "/query-executor",
  },
  {
    icon: Sparkles,
    title: "Smart Result Grids",
    description:
      "Beautiful, scrollable tables with sticky headers, automatic type formatting, and row counts for datasets up to 1000+ rows.",
    href: "/query-executor",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise Safety",
    description:
      "Read-only enforcement, SQL injection protection, execution sandboxing, and detailed error messages for debugging.",
    href: "/query-executor",
  },
]

const techStack = [
  "Next.js 15",
  "React 19",
  "TypeScript",
  "Tailwind CSS 4",
  "pgvector",
  "Prisma",
  "PostgreSQL",
  "Google Gemini AI",
]

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-white/20 via-white/5 to-transparent blur-3xl" />
        <div className="absolute bottom-[-30%] right-[-10%] h-[420px] w-[420px] rounded-full bg-gradient-to-tr from-purple-600/40 via-fuchsia-500/10 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-12 sm:px-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2 text-lg font-medium text-white/80">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-sm font-semibold">
                SD
              </span>
              SynapseDB
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/60">
            <span>Ask anything about your workforce.</span>
            <div className="hidden h-4 w-px bg-white/10 sm:block" />
            <span>Instant answers. Zero dashboards.</span>
          </div>
        </header>

        <main className="flex flex-col gap-16">
          <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-8">
              <div className="space-y-5">
                <Badge className="border-white/30 bg-white/5 text-white/90">
                  AI Employee Intelligence Platform
                </Badge>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  Ask questions like a human. Receive answers like a data warehouse.
                </h1>
                <p className="max-w-xl text-lg text-white/70">
                  SynapseDB turns natural language into governed SQL, merges results with policy docs, and keeps your entire employee knowledge base searchable in one black-glass console.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button asChild className="bg-white text-black hover:bg-white/90" size="lg">
                  <Link href="/smart-query" className="inline-flex items-center gap-2">
                    Launch Smart Query
                    <ArrowUpRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  className="border border-white/20 bg-white/5 text-white hover:bg-white/10"
                  size="lg"
                  asChild
                >
                  <Link href="/upload-enhanced">Upload Employee Docs</Link>
                </Button>
              </div>
            </div>

            <Card className="border-white/10 bg-white/[0.03]">
              <CardGradient />
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between text-sm text-white/60">
                  <span>Quick Actions</span>
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="size-3.5" />
                    Smart assist ON
                  </span>
                </div>
                <div className="grid gap-3 text-sm">
                  {["Who is eligible for the Q4 retention bonus?", "Show employees hired in 2024 with their benefits policy", "Compare PTO carryover by department"].map(
                    (shortcut) => (
                      <button
                        key={shortcut}
                        className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-white/80 transition hover:border-white/20 hover:bg-white/10"
                        onClick={() => window.location.href = `/smart-query?q=${encodeURIComponent(shortcut)}`}
                      >
                        <span>{shortcut}</span>
                        <ArrowUpRight className="size-4 text-white/40 transition group-hover:text-white/80" />
                      </button>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {primaryLinks.map(({ title, description, href, icon: Icon, badge }) => (
              <Card key={title} className="border-white/10 bg-white/[0.02]">
                <CardGradient />
                <CardContent className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-white/80">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                        <Icon className="size-5" />
                      </div>
                      <h2 className="text-lg font-semibold text-white">{title}</h2>
                    </div>
                    {badge && (
                      <Badge className="border-white/20 bg-white/10 text-white">{badge}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-white/60">{description}</p>
                  <Button
                    variant="ghost"
                    className="group flex items-center gap-2 self-start rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/80 hover:bg-white/10"
                    asChild
                  >
                    <Link href={href}>
                      Explore
                      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            {strengths.map(({ icon: Icon, title, items }) => (
              <Card key={title} className="border-white/10 bg-white/[0.02]">
                <CardGradient />
                <CardContent className="space-y-5">
                  <div className="flex items-center gap-3 text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-xl font-semibold">{title}</h3>
                  </div>
                  <ul className="space-y-3 text-sm text-white/70">
                    {items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span className="mt-1 h-2 w-2 rounded-full bg-white/50" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            {performance.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-white/10 bg-white/[0.02]">
                <CardGradient />
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 text-white">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="text-xl font-semibold">{title}</h3>
                  </div>
                  <p className="text-sm text-white/70">{description}</p>
                </CardContent>
              </Card>
            ))}
          </section>

          <section className="space-y-5">
            <div className="space-y-3">
              <h3 className="text-2xl font-semibold text-white">SQL Generator & Query Executor</h3>
              <p className="max-w-2xl text-sm text-white/60">
                Two powerful tools for transforming natural language into production SQL—generate for preview and portability, or execute for instant results.
              </p>
            </div>

            <div className="space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">SQL Generator</h4>
                  <Button
                    variant="ghost"
                    className="group flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/80 hover:bg-white/10"
                    asChild
                  >
                    <Link href="/query-generator">
                      Open SQL Generator
                      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {sqlGeneratorFeatures.map(({ icon: Icon, title, description, href }) => (
                    <Card key={title} className="group border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] transition">
                      <CardGradient />
                      <Link href={href} aria-label={`${title} — open SQL Generator`} className="block">
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between gap-3 text-white">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                                <Icon className="size-5" />
                              </div>
                              <h4 className="text-lg font-semibold">{title}</h4>
                            </div>
                            <ArrowUpRight className="size-4 text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </div>
                          <p className="text-sm text-white/70">{description}</p>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-semibold text-white">Query Executor</h4>
                  <Button
                    variant="ghost"
                    className="group flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-white/80 hover:bg-white/10"
                    asChild
                  >
                    <Link href="/query-executor">
                      Open Query Executor
                      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {queryExecutorFeatures.map(({ icon: Icon, title, description, href }) => (
                    <Card key={title} className="group border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04] transition">
                      <CardGradient />
                      <Link href={href} aria-label={`${title} — open Query Executor`} className="block">
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between gap-3 text-white">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                                <Icon className="size-5" />
                              </div>
                              <h4 className="text-lg font-semibold">{title}</h4>
                            </div>
                            <ArrowUpRight className="size-4 text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                          </div>
                          <p className="text-sm text-white/70">{description}</p>
                        </CardContent>
                      </Link>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="text-sm uppercase tracking-[0.35em] text-white/40">
              Built on the modern data stack
            </h3>
            <div className="flex flex-wrap gap-3">
              {techStack.map((tech) => (
                <Badge key={tech} variant="outline" className="border-white/20 text-white/70">
                  {tech}
                </Badge>
              ))}
            </div>
          </section>
        </main>

        <footer className="mt-auto flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SynapseDB. Crafted for AI-native employee analytics.</p>
          <div className="flex gap-4">
            <Link href="/help" className="hover:text-white">Help Center</Link>
            <Link href="/query" className="hover:text-white">Run a Demo Query</Link>
          </div>
        </footer>
      </div>
    </div>
  )
}
