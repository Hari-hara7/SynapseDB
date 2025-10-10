"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Search,
  Shield,
  Zap,
  Database,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Lock,
  Activity,
} from "lucide-react"

interface PipelineResponse {
  success: boolean
  query_type: "structured" | "document" | "hybrid"
  structured_results?: any[]
  document_results?: any[]
  sql?: string
  performance: {
    classification_ms: number
    security_check_ms: number
    optimization_ms: number
    cache_check_ms: number
    sql_generation_ms: number
    sql_execution_ms: number
    embedding_generation_ms: number
    document_search_ms: number
    total_ms: number
    cache_hit: boolean
    cache_stats?: {
      size: number
      maxSize: number
      totalHits: number
      avgHitsPerEntry: number
      utilizationPercent: number
    }
  }
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  optimization?: {
    hints: string[]
    estimatedCost: string
    costFactors: string[]
  }
  security?: {
    safe: boolean
    warnings: string[]
  }
  errors?: string[]
}

export default function QueryPipelinePage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PipelineResponse | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)

  const executeQuery = async () => {
    if (!query.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch("/api/query-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          page,
          pageSize,
          enableCache: true,
          userId: "demo-user",
        }),
      })

      const data = await response.json()
      
      // Debug: Log API response
      console.log("API Response:", data)
      
      // Ensure data has proper structure even if API returns error
      const normalizedData = {
        ...data,
        performance: data.performance || {
          classification_ms: 0,
          security_check_ms: 0,
          optimization_ms: 0,
          cache_check_ms: 0,
          sql_generation_ms: 0,
          sql_execution_ms: 0,
          embedding_generation_ms: 0,
          document_search_ms: 0,
          total_ms: 0,
          cache_hit: false,
        },
        query_type: data.query_type || "structured",
        errors: data.errors || (data.error ? [data.error] : []),
      }
      
      setResult(normalizedData)
    } catch (error: any) {
      setResult({
        success: false,
        query_type: "structured",
        performance: {
          classification_ms: 0,
          security_check_ms: 0,
          optimization_ms: 0,
          cache_check_ms: 0,
          sql_generation_ms: 0,
          sql_execution_ms: 0,
          embedding_generation_ms: 0,
          document_search_ms: 0,
          total_ms: 0,
          cache_hit: false,
        },
        errors: [error.message],
      })
    } finally {
      setLoading(false)
    }
  }

  const formatMs = (ms: number) => {
    if (ms < 1) return "<1ms"
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Activity className="size-8 text-white" />
            <h1 className="text-4xl font-bold">Production Query Pipeline</h1>
          </div>
          <p className="text-white/60 text-lg">
            Enterprise-grade query processing with classification, security, optimization, and caching
          </p>
        </div>

        {/* Pipeline Features */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Search className="size-5 text-blue-400" />
                </div>
                <div>
                  <div className="font-semibold">Classification</div>
                  <div className="text-sm text-white/50">AI-powered routing</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Shield className="size-5 text-green-400" />
                </div>
                <div>
                  <div className="font-semibold">Security</div>
                  <div className="text-sm text-white/50">SQL injection protection</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Zap className="size-5 text-purple-400" />
                </div>
                <div>
                  <div className="font-semibold">Optimization</div>
                  <div className="text-sm text-white/50">Index hints & pagination</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="size-5 text-orange-400" />
                </div>
                <div>
                  <div className="font-semibold">Caching</div>
                  <div className="text-sm text-white/50">5-minute TTL</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Query Input */}
        <Card className="border-white/10 bg-white/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="size-5" />
              Query Input
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything... (e.g., Show all employees hired in 2024)"
                className="flex-1 bg-black border-white/20 text-white placeholder:text-white/40"
                onKeyDown={(e) => e.key === "Enter" && executeQuery()}
              />
              <Button
                onClick={executeQuery}
                disabled={loading || !query.trim()}
                className="bg-white text-black hover:bg-white/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Processing
                  </>
                ) : (
                  "Execute"
                )}
              </Button>
            </div>

            <div className="flex gap-2 items-center text-sm text-white/60">
              <span>Page:</span>
              <Input
                type="number"
                value={page}
                onChange={(e) => setPage(Number(e.target.value))}
                className="w-20 bg-black border-white/20 text-white"
                min={1}
              />
              <span>Size:</span>
              <Input
                type="number"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="w-20 bg-black border-white/20 text-white"
                min={10}
                max={1000}
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-white/10 bg-white/5">
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Query Type</span>
                    <Badge
                      className={
                        result.query_type === "structured"
                          ? "bg-blue-500/20 text-blue-300"
                          : result.query_type === "document"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-purple-500/20 text-purple-300"
                      }
                    >
                      {result.query_type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Total Time</span>
                    <span className="font-mono font-semibold">{formatMs(result.performance?.total_ms || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Cache Hit</span>
                    {result.performance?.cache_hit ? (
                      <CheckCircle2 className="size-4 text-green-400" />
                    ) : (
                      <span className="text-white/40">-</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Security Status</span>
                    {result.security?.safe ? (
                      <Badge className="bg-green-500/20 text-green-300">
                        <Lock className="size-3 mr-1" />
                        Safe
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-300">Unsafe</Badge>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Query Cost</span>
                    <Badge
                      className={
                        result.optimization?.estimatedCost === "low"
                          ? "bg-green-500/20 text-green-300"
                          : result.optimization?.estimatedCost === "medium"
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-red-500/20 text-red-300"
                      }
                    >
                      {result.optimization?.estimatedCost || "unknown"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Warnings</span>
                    <span className="font-mono">{result.security?.warnings?.length || 0}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-white/10 bg-white/5">
                <CardContent className="pt-6 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">Results</span>
                    <span className="font-mono font-semibold">
                      {(result.structured_results?.length || 0) + (result.document_results?.length || 0)}
                    </span>
                  </div>
                  {result.pagination && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Total Records</span>
                        <span className="font-mono">{result.pagination.total}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/60">Pages</span>
                        <span className="font-mono">
                          {result.pagination.page} / {result.pagination.totalPages}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Breakdown */}
            <Card className="border-white/10 bg-white/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-5" />
                  Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {result.performance && Object.entries(result.performance)
                    .filter(([key]) => key.endsWith("_ms") && key !== "total_ms")
                    .map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <div className="text-xs text-white/50 capitalize">
                          {key.replace(/_ms$/, "").replace(/_/g, " ")}
                        </div>
                        <div className="font-mono text-lg">{formatMs(value as number)}</div>
                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                            style={{
                              width: `${Math.min(100, ((value as number) / (result.performance?.total_ms || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Optimization Hints */}
            {result.optimization?.hints && result.optimization.hints.length > 0 && (
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="size-5" />
                    Optimization Hints
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.optimization.hints.map((hint, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="size-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-white/70">{hint}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Security Warnings */}
            {result.security?.warnings && result.security.warnings.length > 0 && (
              <Card className="border-yellow-500/20 bg-yellow-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="size-5" />
                    Security Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.security.warnings.map((warning, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-yellow-300/80">
                        <AlertTriangle className="size-4 mt-0.5 flex-shrink-0" />
                        <span>{warning}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated SQL */}
            {result.sql && (
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="size-5" />
                    Generated SQL
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-black/50 p-4 rounded-lg overflow-x-auto text-sm">
                    <code className="text-green-400">{result.sql}</code>
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {result.structured_results && result.structured_results.length > 0 && (
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="size-5" />
                    Structured Results ({result.structured_results.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          {Object.keys(result.structured_results[0]).map((key) => (
                            <th key={key} className="text-left p-2 text-white/60 font-medium">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {result.structured_results.slice(0, 10).map((row, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                            {Object.values(row).map((value, vidx) => (
                              <td key={vidx} className="p-2">
                                {String(value)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {result.structured_results.length > 10 && (
                      <div className="text-center text-sm text-white/50 mt-4">
                        Showing 10 of {result.structured_results.length} results
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {result.document_results && result.document_results.length > 0 && (
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="size-5" />
                    Document Results ({result.document_results.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.document_results.map((doc, idx) => (
                      <div key={idx} className="p-4 bg-black/30 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-white/40">{doc.id}</span>
                          <Badge className="bg-blue-500/20 text-blue-300">
                            {(doc.similarity * 100).toFixed(1)}% match
                          </Badge>
                        </div>
                        <p className="text-sm text-white/80">{doc.content}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <Card className="border-red-500/20 bg-red-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="size-5" />
                    Errors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.errors.map((error, idx) => (
                      <div key={idx} className="text-sm text-red-300/80">
                        {error}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
