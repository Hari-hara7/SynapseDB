/**
 * Query Security Layer
 * Prevents SQL injection, validates query safety, enforces read-only operations
 */

export interface SecurityCheckResult {
  safe: boolean
  errors: string[]
  warnings: string[]
  sanitizedQuery?: string
}

/**
 * Comprehensive SQL injection detection
 */
export function detectSQLInjection(query: string): SecurityCheckResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Dangerous patterns that indicate SQL injection attempts
  const dangerousPatterns = [
    // Command execution
    /xp_cmdshell/i,
    /exec\s+master/i,
    /execute\s+master/i,

    // File operations
    /bulk\s+insert/i,
    /openrowset/i,
    /opendatasource/i,
    /sp_oacreate/i,

    // System functions
    /pg_read_file/i,
    /pg_ls_dir/i,
    /lo_import/i,
    /lo_export/i,

    // Stacked queries (multiple statements)
    /;\s*(drop|delete|truncate|alter|create|grant|revoke)/i,

    // Comment-based injection
    /--[^\n]*?(union|select|insert|update|delete)/i,
    /\/\*.*?(union|select|insert|update|delete).*?\*\//i,

    // Union-based injection
    /union\s+(all\s+)?select/i,

    // Boolean-based blind injection patterns
    /'\s*(or|and)\s*'?\s*'?\s*=\s*'?/i,
    /'\s*(or|and)\s+\d+\s*=\s*\d+/i,

    // Time-based blind injection
    /waitfor\s+delay/i,
    /pg_sleep/i,
    /sleep\s*\(/i,
    /benchmark\s*\(/i,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      errors.push(`Detected dangerous SQL pattern: ${pattern.source}`)
    }
  }

  // Warning patterns (suspicious but potentially legitimate)
  const suspiciousPatterns = [
    { pattern: /information_schema/i, message: "Access to information_schema detected" },
    { pattern: /pg_catalog/i, message: "Access to pg_catalog detected" },
    { pattern: /'\s*\+\s*'/i, message: "String concatenation in query" },
    { pattern: /char\s*\(/i, message: "CHAR() function usage detected" },
    { pattern: /concat\s*\(/i, message: "CONCAT() function usage detected" },
  ]

  for (const { pattern, message } of suspiciousPatterns) {
    if (pattern.test(query)) {
      warnings.push(message)
    }
  }

  return {
    safe: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Enforce read-only operations
 */
export function enforceReadOnly(query: string): SecurityCheckResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Normalize query
  const normalized = query.trim().toUpperCase()

  // Check for write operations
  const writeOperations = ["INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER", "TRUNCATE", "GRANT", "REVOKE"]

  for (const op of writeOperations) {
    // Check at start of query or after semicolon
    const pattern = new RegExp(`(^|;)\\s*${op}\\s+`, "i")
    if (pattern.test(query)) {
      errors.push(`Write operation not allowed: ${op}`)
    }
  }

  // Must start with SELECT or WITH (for CTEs)
  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    errors.push("Query must be a SELECT statement or CTE")
  }

  // Check for multiple statements
  const statements = query.split(";").filter((s) => s.trim())
  if (statements.length > 1) {
    warnings.push("Multiple statements detected - only the first will be executed")
  }

  return {
    safe: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate query structure
 */
export function validateQueryStructure(query: string): SecurityCheckResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Check for balanced quotes
  const singleQuotes = (query.match(/'/g) || []).length
  if (singleQuotes % 2 !== 0) {
    errors.push("Unbalanced single quotes detected")
  }

  const doubleQuotes = (query.match(/"/g) || []).length
  if (doubleQuotes % 2 !== 0) {
    errors.push("Unbalanced double quotes detected")
  }

  // Check for balanced parentheses
  let parenBalance = 0
  for (const char of query) {
    if (char === "(") parenBalance++
    if (char === ")") parenBalance--
    if (parenBalance < 0) {
      errors.push("Unbalanced parentheses detected")
      break
    }
  }
  if (parenBalance > 0) {
    errors.push("Unclosed parentheses detected")
  }

  // Check query length
  if (query.length > 10000) {
    warnings.push("Query exceeds recommended length (10000 characters)")
  }

  // Check for excessive complexity
  const selectCount = (query.match(/\bselect\b/gi) || []).length
  if (selectCount > 10) {
    warnings.push(`High number of SELECT clauses (${selectCount}) - may impact performance`)
  }

  const joinCount = (query.match(/\bjoin\b/gi) || []).length
  if (joinCount > 8) {
    warnings.push(`High number of JOINs (${joinCount}) - may impact performance`)
  }

  return {
    safe: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Comprehensive security validation
 */
export function validateQuerySecurity(query: string): SecurityCheckResult {
  const results = [detectSQLInjection(query), enforceReadOnly(query), validateQueryStructure(query)]

  const allErrors = results.flatMap((r) => r.errors)
  const allWarnings = results.flatMap((r) => r.warnings)

  return {
    safe: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}

/**
 * Sanitize user input for parameterized queries
 */
export function sanitizeInput(input: any): any {
  if (typeof input === "string") {
    // Remove dangerous characters
    return input.replace(/[;\-\-\/\*\*\/]/g, "").trim()
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }

  if (typeof input === "object" && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }

  return input
}

/**
 * Rate limiting for query execution
 */
class RateLimiter {
  private requests: Map<string, number[]>
  private maxRequests: number
  private windowMs: number

  constructor(maxRequests = 100, windowMs = 60000) {
    // 100 requests per minute
    this.requests = new Map()
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now()
    const userRequests = this.requests.get(identifier) || []

    // Remove old requests outside the window
    const validRequests = userRequests.filter((timestamp) => now - timestamp < this.windowMs)

    if (validRequests.length >= this.maxRequests) {
      return false
    }

    validRequests.push(now)
    this.requests.set(identifier, validRequests)

    return true
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now()
    const userRequests = this.requests.get(identifier) || []
    const validRequests = userRequests.filter((timestamp) => now - timestamp < this.windowMs)

    return Math.max(0, this.maxRequests - validRequests.length)
  }

  reset(identifier: string): void {
    this.requests.delete(identifier)
  }
}

export const rateLimiter = new RateLimiter()
