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
