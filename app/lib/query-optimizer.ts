/**
 * Query Optimizer
 * Implements performance optimizations: indexing hints, pagination, query rewriting
 */

import { Prisma } from "@prisma/client"

export interface PaginationOptions {
  page: number
  pageSize: number
}

export interface OptimizedQuery {
  sql: string
  countSql?: string
  pagination?: {
    page: number
    pageSize: number
    offset: number
    limit: number
  }
  hints: string[]
  estimatedRows?: number
}

/**
 * Add pagination to SELECT queries
 */
export function paginateQuery(sql: string, options: PaginationOptions): OptimizedQuery {
  const { page = 1, pageSize = 50 } = options
  const hints: string[] = []

  // Validate pagination params
  const validPage = Math.max(1, page)
  const validPageSize = Math.min(1000, Math.max(10, pageSize)) // Max 1000 rows per page

  const offset = (validPage - 1) * validPageSize
  const limit = validPageSize

  // Remove existing LIMIT/OFFSET if present
  let cleanedSql = sql.replace(/LIMIT\s+\d+/i, "").replace(/OFFSET\s+\d+/i, "").trim()

  // Ensure semicolon is removed
  cleanedSql = cleanedSql.replace(/;$/, "")

  // Add pagination
  const paginatedSql = `${cleanedSql}\nLIMIT ${limit} OFFSET ${offset}`

  // Generate count query for total results
  const countSql = `SELECT COUNT(*) as total FROM (${cleanedSql}) as subquery`

  hints.push(`Paginating: page ${validPage}, ${validPageSize} rows per page`)
  hints.push(`Offset: ${offset}, Limit: ${limit}`)

  if (pageSize > 1000) {
    hints.push("Page size capped at 1000 rows for performance")
  }

  return {
    sql: paginatedSql,
    countSql,
    pagination: {
      page: validPage,
      pageSize: validPageSize,
      offset,
      limit,
    },
    hints,
  }
}

/**
 * Add index hints to query
 */
export function addIndexHints(sql: string, tableIndexes: Map<string, string[]>): OptimizedQuery {
  const hints: string[] = []
  let optimizedSql = sql

  // Detect tables in FROM clause
  const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i)
  if (!fromMatch) {
    return { sql, hints }
  }

  const tableName = fromMatch[1]
  const indexes = tableIndexes.get(tableName.toLowerCase()) || []

  // Check for WHERE clause columns
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|$)/i)
  if (whereMatch) {
    const whereClause = whereMatch[1]

    // Check if WHERE columns match available indexes
    for (const index of indexes) {
      if (whereClause.toLowerCase().includes(index.toLowerCase())) {
        hints.push(`Index available on ${tableName}.${index}`)
      }
    }
  }

  // Check for ORDER BY optimization
  const orderByMatch = sql.match(/ORDER BY\s+([a-zA-Z0-9_]+)/i)
  if (orderByMatch) {
    const orderColumn = orderByMatch[1]
    if (indexes.includes(orderColumn)) {
      hints.push(`Index available for ORDER BY on ${orderColumn}`)
    } else {
      hints.push(`Consider creating index on ${tableName}.${orderColumn} for ORDER BY optimization`)
    }
  }

  // Check for JOIN optimization
  const joinMatches = sql.matchAll(/JOIN\s+([a-zA-Z0-9_]+)\s+ON\s+([a-zA-Z0-9_.]+)\s*=\s*([a-zA-Z0-9_.]+)/gi)
  for (const match of joinMatches) {
    const joinTable = match[1]
    const leftColumn = match[2].split(".").pop() || ""
    const rightColumn = match[3].split(".").pop() || ""

    const joinIndexes = tableIndexes.get(joinTable.toLowerCase()) || []
    if (!joinIndexes.includes(leftColumn) && !joinIndexes.includes(rightColumn)) {
      hints.push(`Consider adding index on join column: ${joinTable}.${rightColumn}`)
    }
  }

  return {
    sql: optimizedSql,
    hints,
  }
}

/**
 * Optimize SELECT * queries to explicit columns
 */
export function optimizeSelectStar(sql: string, tableColumns: Map<string, string[]>): OptimizedQuery {
  const hints: string[] = []
  let optimizedSql = sql

  // Check for SELECT *
  if (/SELECT\s+\*/i.test(sql)) {
    hints.push("SELECT * detected - consider specifying explicit columns for better performance")

    // Try to replace with explicit columns if we have schema info
    const fromMatch = sql.match(/FROM\s+([a-zA-Z0-9_]+)/i)
    if (fromMatch) {
      const tableName = fromMatch[1]
      const columns = tableColumns.get(tableName.toLowerCase())

      if (columns && columns.length > 0) {
        const columnList = columns.join(", ")
        optimizedSql = sql.replace(/SELECT\s+\*/i, `SELECT ${columnList}`)
        hints.push(`Replaced SELECT * with explicit columns: ${columns.slice(0, 5).join(", ")}${columns.length > 5 ? "..." : ""}`)
      }
    }
  }

  return {
    sql: optimizedSql,
    hints,
  }
}

/**
 * Detect and optimize subqueries
 */
export function optimizeSubqueries(sql: string): OptimizedQuery {
  const hints: string[] = []
  const optimizedSql = sql

  // Count subqueries
  const subqueryCount = (sql.match(/SELECT[\s\S]*?FROM\s*\(/gi) || []).length

  if (subqueryCount > 0) {
    hints.push(`${subqueryCount} subquery(ies) detected`)

    if (subqueryCount > 3) {
      hints.push("Consider using CTEs (WITH clause) for better readability and potential performance")
    }
  }

  // Detect correlated subqueries (potential performance issue)
  const correlatedPattern = /WHERE\s+[a-zA-Z0-9_.]+\s+IN\s*\(\s*SELECT/i
  if (correlatedPattern.test(sql)) {
    hints.push("Correlated subquery detected - consider using JOIN instead for better performance")
  }

  return {
    sql: optimizedSql,
    hints,
  }
}

/**
 * Add query timeouts
 */
export function addQueryTimeout(sql: string, timeoutMs = 30000): string {
  // PostgreSQL: SET statement_timeout
  return `SET LOCAL statement_timeout = ${timeoutMs}; ${sql}`
}

/**
 * Comprehensive query optimization
 */
export async function optimizeQuery(
  sql: string,
  options: {
    pagination?: PaginationOptions
    tableIndexes?: Map<string, string[]>
    tableColumns?: Map<string, string[]>
    enableTimeout?: boolean
    timeoutMs?: number
  } = {}
): Promise<OptimizedQuery> {
  let result: OptimizedQuery = { sql, hints: [] }

  // Apply pagination
  if (options.pagination) {
    const paginated = paginateQuery(result.sql, options.pagination)
    result = {
      ...result,
      ...paginated,
      hints: [...result.hints, ...paginated.hints],
    }
  }

  // Add index hints
  if (options.tableIndexes) {
    const indexed = addIndexHints(result.sql, options.tableIndexes)
    result = {
      ...result,
      sql: indexed.sql,
      hints: [...result.hints, ...indexed.hints],
    }
  }

  // Optimize SELECT *
  if (options.tableColumns) {
    const optimized = optimizeSelectStar(result.sql, options.tableColumns)
    result = {
      ...result,
      sql: optimized.sql,
      hints: [...result.hints, ...optimized.hints],
    }
  }

  // Optimize subqueries
  const subqueryOpt = optimizeSubqueries(result.sql)
  result = {
    ...result,
    hints: [...result.hints, ...subqueryOpt.hints],
  }

  // Add timeout
  if (options.enableTimeout) {
    result.sql = addQueryTimeout(result.sql, options.timeoutMs)
    result.hints.push(`Query timeout set to ${options.timeoutMs || 30000}ms`)
  }

  return result
}

/**
 * Estimate query cost (simplified heuristic)
 */
export function estimateQueryCost(sql: string): {
  cost: "low" | "medium" | "high"
  factors: string[]
} {
  const factors: string[] = []
  let score = 0

  // Count JOINs
  const joinCount = (sql.match(/\bJOIN\b/gi) || []).length
  if (joinCount > 0) {
    score += joinCount * 10
    factors.push(`${joinCount} JOIN(s)`)
  }

  // Count subqueries
  const subqueryCount = (sql.match(/SELECT[\s\S]*?FROM\s*\(/gi) || []).length
  if (subqueryCount > 0) {
    score += subqueryCount * 15
    factors.push(`${subqueryCount} subquery(ies)`)
  }

  // Check for aggregations
  const aggregations = sql.match(/\b(COUNT|SUM|AVG|MIN|MAX|GROUP BY)\b/gi) || []
  if (aggregations.length > 0) {
    score += aggregations.length * 5
    factors.push(`${aggregations.length} aggregation(s)`)
  }

  // Check for DISTINCT
  if (/\bDISTINCT\b/i.test(sql)) {
    score += 10
    factors.push("DISTINCT operation")
  }

  // Check for sorting
  if (/\bORDER BY\b/i.test(sql)) {
    score += 5
    factors.push("ORDER BY clause")
  }

  // Check for LIKE patterns
  const likeCount = (sql.match(/\bLIKE\b/gi) || []).length
  if (likeCount > 0) {
    score += likeCount * 8
    factors.push(`${likeCount} LIKE pattern(s)`)
  }

  // Determine cost level
  let cost: "low" | "medium" | "high"
  if (score < 20) {
    cost = "low"
  } else if (score < 50) {
    cost = "medium"
  } else {
    cost = "high"
  }

  return { cost, factors }
}
