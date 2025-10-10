// lib/sql-utils.ts

/**
 * Checks if a SQL query is safe to run.
 * Only allows read-only queries (SELECT / WITH).
 * Disallows multiple statements and dangerous keywords.
 * @param sql - SQL string
 * @returns boolean - true if safe
 */
export function isSafeSelectSQL(sql: string): boolean {
  if (!sql) return false

  const lower = sql.trim().toLowerCase()

  // Disallow multiple statements (semicolon)
  if (lower.includes(';')) return false

  // Must start with SELECT or WITH
  if (!/^(select|with)\s/.test(lower)) return false

  // Disallow dangerous keywords
  const forbidden = [
    'insert ',
    'update ',
    'delete ',
    'drop ',
    'alter ',
    'create ',
    'grant ',
    'revoke ',
    'truncate ',
    'exec ',
    'call ',
    'pg_read_file', // PostgreSQL file read
    'pg_sleep',     // time-based attack
  ]

  for (const kw of forbidden) {
    if (lower.includes(kw)) return false
  }

  return true
}

/**
 * Attempts to extract a single SELECT/WITH statement from an LLM response and
 * remove markdown code fences, commentary, and trailing semicolons.
 * Returns null if a usable statement cannot be derived.
 */
export function sanitizeLLMSQL(raw: string | null | undefined): string | null {
  if (!raw) return null

  let text = raw.trim()
  if (!text) return null

  const codeBlockMatch = text.match(/```(?:sql)?\s*([\s\S]*?)```/i)
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim()
  }

  text = text.replace(/^sql\s*:\s*/i, "").trim()

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/--.*$/, "").trim())
    .filter(Boolean)

  text = lines.join(" ").trim()

  const lower = text.toLowerCase()
  const firstKeywordIndex = Math.min(
    ...["select", "with"].map((kw) => {
      const idx = lower.indexOf(kw)
      return idx === -1 ? Number.POSITIVE_INFINITY : idx
    })
  )

  if (!Number.isFinite(firstKeywordIndex)) {
    return null
  }

  text = text.slice(firstKeywordIndex).trim()

  while (text.endsWith(";")) {
    text = text.slice(0, -1).trim()
  }

  return text || null
}
