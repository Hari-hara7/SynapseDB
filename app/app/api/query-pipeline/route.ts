/**
 * Production Query Processing Pipeline
 * Integrates: Classification, Caching, Optimization, Security, Performance Monitoring
 */

import { NextRequest, NextResponse } from "next/server"
import { geminiGenerate } from "@/lib/gemini"
import { prisma } from "@/lib/prisma"
import { generateEmbeddings } from "@/lib/embeddings"
import { queryCache } from "@/lib/query-cache"
import { validateQuerySecurity, rateLimiter, SecurityCheckResult } from "@/lib/query-security"
import { optimizeQuery, estimateQueryCost, paginateQuery } from "@/lib/query-optimizer"

export const maxDuration = 60

interface QueryPipelineRequest {
  query: string
  page?: number
  pageSize?: number
  enableCache?: boolean
  userId?: string
}

interface QueryPipelineResponse {
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
    cache_stats?: any
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

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const timings: Record<string, number> = {}

  try {
    const body: QueryPipelineRequest = await request.json()
    const { query, page = 1, pageSize = 50, enableCache = true, userId = "anonymous" } = body

    if (!query?.trim()) {
      return NextResponse.json({ success: false, error: "Query is required" }, { status: 400 })
    }

    // Rate limiting
    const rateLimitStart = Date.now()
    if (!rateLimiter.isAllowed(userId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Rate limit exceeded",
          remaining: rateLimiter.getRemainingRequests(userId),
        },
        { status: 429 }
      )
    }
    timings.rate_limit_ms = Date.now() - rateLimitStart

    // STEP 1: Check cache
    const cacheStart = Date.now()
    let cacheHit = false
    if (enableCache) {
      const cached = queryCache.get<QueryPipelineResponse>(query, { page, pageSize })
      if (cached) {
        cacheHit = true
        timings.cache_check_ms = Date.now() - cacheStart
        return NextResponse.json({
          ...cached.data,
          performance: {
            ...cached.data.performance,
            cache_hit: true,
            cache_check_ms: timings.cache_check_ms,
          },
        })
      }
    }
    timings.cache_check_ms = Date.now() - cacheStart

    // STEP 2: Query Classification
    const classificationStart = Date.now()
    const classification = await classifyQuery(query)
    timings.classification_ms = Date.now() - classificationStart

    // STEP 3: Security Check
    const securityStart = Date.now()
    let securityResult: SecurityCheckResult = { safe: true, errors: [], warnings: [] }
    let sqlQuery = ""

    if (classification === "structured" || classification === "hybrid") {
      // Generate SQL
      const sqlStart = Date.now()
      sqlQuery = await generateSQL(query)
      timings.sql_generation_ms = Date.now() - sqlStart

      // Validate security
      securityResult = validateQuerySecurity(sqlQuery)
      if (!securityResult.safe) {
        return NextResponse.json(
          {
            success: false,
            error: "Query failed security validation",
            details: securityResult.errors,
          },
          { status: 400 }
        )
      }
    }
    timings.security_check_ms = Date.now() - securityStart

    // STEP 4: Query Optimization
    const optimizationStart = Date.now()
    let optimizedQuery = sqlQuery
    let optimizationHints: string[] = []
    let paginationInfo: any = undefined

    if (sqlQuery) {
      try {
        // Get schema metadata for optimization
        const tableIndexes = await getTableIndexes()
        const tableColumns = await getTableColumns()

        const optimized = await optimizeQuery(sqlQuery, {
          pagination: { page, pageSize },
          tableIndexes,
          tableColumns,
          enableTimeout: true,
          timeoutMs: 30000,
        })

        optimizedQuery = optimized.sql
        optimizationHints = optimized.hints || []
        paginationInfo = optimized.pagination
      } catch (error: any) {
        console.warn("Optimization failed, using basic pagination:", error.message)
        // Fallback to basic pagination if optimization fails
        const basicOptimized = await optimizeQuery(sqlQuery, {
          pagination: { page, pageSize },
        })
        optimizedQuery = basicOptimized.sql
        optimizationHints = basicOptimized.hints || []
        paginationInfo = basicOptimized.pagination
      }
    }

    const costEstimate = sqlQuery ? estimateQueryCost(sqlQuery) : { cost: "low", factors: [] }
    timings.optimization_ms = Date.now() - optimizationStart

    // STEP 5: Execute Queries
    let structuredResults: any[] = []
    let documentResults: any[] = []
    let totalCount = 0

    if (classification === "structured" || classification === "hybrid") {
      const executionStart = Date.now()
      try {
        // Execute main query
        structuredResults = await prisma.$queryRawUnsafe(optimizedQuery)

        // Get total count if paginated
        if (paginationInfo) {
          const countResult = await prisma.$queryRawUnsafe<[{ total: bigint }]>(
            `SELECT COUNT(*) as total FROM (${sqlQuery}) as subquery`
          )
          totalCount = Number(countResult[0]?.total || 0)
        }
      } catch (error: any) {
        console.error("SQL execution error:", error)
        return NextResponse.json(
          {
            success: false,
            error: "Query execution failed",
            details: error.message,
          },
          { status: 500 }
        )
      }
      timings.sql_execution_ms = Date.now() - executionStart
    }

    if (classification === "document" || classification === "hybrid") {
      try {
        const embeddingStart = Date.now()
        const embeddings = await generateEmbeddings([query])
        timings.embedding_generation_ms = Date.now() - embeddingStart

        const searchStart = Date.now()
        const docs = await prisma.$queryRaw<any[]>`
          SELECT 
            id, 
            content, 
            metadata, 
            1 - (embedding <=> ${embeddings[0]}::vector) as similarity
          FROM "Document"
          WHERE 1 - (embedding <=> ${embeddings[0]}::vector) > 0.5
          ORDER BY embedding <=> ${embeddings[0]}::vector
          LIMIT ${pageSize}
        `
        documentResults = docs
        timings.document_search_ms = Date.now() - searchStart
      } catch (error: any) {
        console.warn("Document search failed:", error.message)
        // Continue without document results
        timings.document_search_ms = 0
      }
    }

    timings.total_ms = Date.now() - startTime

    // Build response
    const response: QueryPipelineResponse = {
      success: true,
      query_type: classification,
      structured_results: structuredResults.length > 0 ? structuredResults : undefined,
      document_results: documentResults.length > 0 ? documentResults : undefined,
      sql: sqlQuery || undefined,
      performance: {
        classification_ms: timings.classification_ms || 0,
        security_check_ms: timings.security_check_ms || 0,
        optimization_ms: timings.optimization_ms || 0,
        cache_check_ms: timings.cache_check_ms || 0,
        sql_generation_ms: timings.sql_generation_ms || 0,
        sql_execution_ms: timings.sql_execution_ms || 0,
        embedding_generation_ms: timings.embedding_generation_ms || 0,
        document_search_ms: timings.document_search_ms || 0,
        total_ms: timings.total_ms,
        cache_hit: cacheHit,
        cache_stats: queryCache.getStats(),
      },
      optimization: {
        hints: optimizationHints,
        estimatedCost: costEstimate.cost,
        costFactors: costEstimate.factors,
      },
      security: {
        safe: securityResult.safe,
        warnings: securityResult.warnings,
      },
    }

    // Add pagination info if available
    if (paginationInfo && totalCount > 0) {
      response.pagination = {
        page: paginationInfo.page,
        pageSize: paginationInfo.pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / paginationInfo.pageSize),
      }
    }

    // Cache the result
    if (enableCache) {
      queryCache.set(query, response, { page, pageSize }, 5 * 60 * 1000) // 5 min TTL
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error("Pipeline error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * Classify query using Gemini
 */
async function classifyQuery(query: string): Promise<"structured" | "document" | "hybrid"> {
  const prompt = `Classify this user query into one of three categories:
- "structured": requires SQL query on database tables (employee data, analytics, aggregations)
- "document": requires semantic search in documents (policies, handbooks, guidelines)
- "hybrid": requires both SQL and document search

Query: "${query}"

Respond with ONLY one word: structured, document, or hybrid`

  try {
    const classification = await geminiGenerate(prompt, {
      temperature: 0,
      maxOutputTokens: 50,
    })

    const type = classification.trim().toLowerCase()
    if (type.includes("structured")) return "structured"
    if (type.includes("document")) return "document"
    if (type.includes("hybrid")) return "hybrid"

    // Default fallback
    return "structured"
  } catch (error) {
    console.error("Classification error:", error)
    return "structured" // Safe default
  }
}

/**
 * Generate SQL using Gemini with schema context
 */
async function generateSQL(query: string): Promise<string> {
  try {
    // Get schema
    const tables = await prisma.$queryRaw<any[]>`
      SELECT 
        t.table_name,
        json_agg(
          json_build_object(
            'column_name', c.column_name,
            'data_type', c.data_type,
            'is_nullable', c.is_nullable
          )
        ) as columns
      FROM information_schema.tables t
      JOIN information_schema.columns c ON t.table_name = c.table_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND c.table_schema = 'public'
      GROUP BY t.table_name
    `

    const schemaContext = tables
      .map((t) => `${t.table_name}: ${JSON.stringify(t.columns)}`)
      .join("\n")

    const prompt = `Given this database schema:
${schemaContext}

Generate a PostgreSQL SELECT query for: "${query}"

Requirements:
- Use only SELECT statements
- Use proper JOINs when needed
- Include WHERE, GROUP BY, ORDER BY as appropriate
- Return ONLY the SQL query, no explanations`

    const sql = await geminiGenerate(prompt, {
      temperature: 0,
      maxOutputTokens: 1024,
    })

    return sql.trim().replace(/```sql\n?/g, "").replace(/```\n?/g, "").trim()
  } catch (error: any) {
    console.error("SQL generation failed:", error)
    // Fallback to a simple query
    return `SELECT * FROM "Document" LIMIT 10`
  }
}

/**
 * Get table indexes for optimization
 */
async function getTableIndexes(): Promise<Map<string, string[]>> {
  try {
    const indexes = await prisma.$queryRaw<any[]>`
      SELECT 
        t.tablename,
        i.indexname,
        array_agg(a.attname) as columns
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.indexname
      JOIN pg_index ix ON ix.indexrelid = c.oid
      JOIN pg_attribute a ON a.attrelid = ix.indrelid AND a.attnum = ANY(ix.indkey)
      JOIN pg_tables t ON t.tablename = i.tablename
      WHERE t.schemaname = 'public'
      GROUP BY t.tablename, i.indexname
    `

    const map = new Map<string, string[]>()
    for (const idx of indexes) {
      const existing = map.get(idx.tablename) || []
      map.set(idx.tablename, [...existing, ...idx.columns])
    }

    return map
  } catch (error) {
    console.warn("Failed to fetch table indexes:", error)
    return new Map()
  }
}

/**
 * Get table columns for optimization
 */
async function getTableColumns(): Promise<Map<string, string[]>> {
  try {
    const columns = await prisma.$queryRaw<any[]>`
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position
    `

    const map = new Map<string, string[]>()
    for (const col of columns) {
      const existing = map.get(col.table_name) || []
      map.set(col.table_name, [...existing, col.column_name])
    }

    return map
  } catch (error) {
    console.warn("Failed to fetch table columns:", error)
    return new Map()
  }
}
