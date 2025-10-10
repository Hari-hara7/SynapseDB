// lib/nl-sql.ts
// Simple, local NL -> SQL generator for common employee analytics patterns.
// Deterministic, no external LLMs. Uses provided schema to choose table/columns.

export type ColumnMeta = { table: string; column: string; dataType?: string }
export type TableSchema = Record<string, ColumnMeta[]>

export type GenerateSqlOptions = {
  question: string
  schema: TableSchema
  limit?: number
}

export type GenerateSqlResult = {
  sql: string
  params: any[]
  chosenTable?: string
  notes?: string[]
}

// Basic keyword maps
const METRIC_SYNONYMS: Record<string, string[]> = {
  salary: ['salary', 'compensation', 'pay', 'ctc', 'package'],
  count: ['count', 'how many', 'headcount', 'number of', 'total employees'],
  avg: ['average', 'avg', 'mean'],
  sum: ['sum', 'total amount', 'total salary'],
}

const DIM_SYNONYMS: Record<string, string[]> = {
  department: ['department', 'dept', 'team'],
  location: ['location', 'office', 'city', 'country', 'region'],
  title: ['title', 'job title', 'position', 'role', 'level'],
}

const DATE_SYNONYMS = ['hire_date', 'start_date', 'join_date', 'joined_at', 'hired_at']

const NAME_SYNONYMS = ['name', 'first_name', 'last_name', 'employee_name', 'full_name']

// Utility: find table with best match for a set of desired columns
function findBestTable(schema: TableSchema, desiredCols: string[]): string | undefined {
  let best: { table?: string; score: number } = { score: -1 }
  for (const [table, cols] of Object.entries(schema)) {
    const names = cols.map((c) => c.column.toLowerCase())
    let score = 0
    for (const d of desiredCols) {
      if (names.includes(d)) score += 2
      else if (names.some((n) => n.includes(d))) score += 1
    }
    if (score > best.score) best = { table, score }
  }
  return best.table
}

function findColumn(schema: TableSchema, table: string, candidates: string[]): string | undefined {
  const cols = schema[table]?.map((c) => c.column.toLowerCase()) || []
  for (const c of candidates) {
    const exact = cols.find((x) => x === c)
    if (exact) return exact
  }
  // fuzzy contains
  for (const c of candidates) {
    const fuzzy = cols.find((x) => x.includes(c))
    if (fuzzy) return fuzzy
  }
  return undefined
}

function anySynonymMatch(text: string, synonyms: string[]): boolean {
  const t = text.toLowerCase()
  return synonyms.some((s) => t.includes(s))
}

function resolveMetric(question: string): 'count' | 'salary' | 'avg' | 'sum' | undefined {
  const q = question.toLowerCase()
  if (anySynonymMatch(q, METRIC_SYNONYMS.count)) return 'count'
  if (anySynonymMatch(q, METRIC_SYNONYMS.sum)) return 'sum'
  if (anySynonymMatch(q, METRIC_SYNONYMS.avg)) return 'avg'
  if (anySynonymMatch(q, METRIC_SYNONYMS.salary)) return 'salary'
  return undefined
}

function resolveGroupBy(question: string): keyof typeof DIM_SYNONYMS | undefined {
  for (const [dim, syns] of Object.entries(DIM_SYNONYMS)) {
    if (anySynonymMatch(question, syns)) return dim as keyof typeof DIM_SYNONYMS
  }
  return undefined
}

function extractTopN(question: string): number | undefined {
  const m = /top\s+(\d{1,3})/i.exec(question)
  if (m) return parseInt(m[1], 10)
  return undefined
}

function extractEqualsFilter(question: string): { dim: keyof typeof DIM_SYNONYMS; value: string } | undefined {
  // e.g., "in Sales", "for Engineering", "of Marketing"
  for (const [dim, syns] of Object.entries(DIM_SYNONYMS)) {
    for (const kw of [' in ', ' for ', ' of ']) {
      const idx = question.toLowerCase().indexOf(kw)
      if (idx !== -1) {
        const after = question.substring(idx + kw.length).trim()
        // take first token/group until punctuation
        const val = after.split(/[.,;\n]/)[0].trim()
        if (val) return { dim: dim as keyof typeof DIM_SYNONYMS, value: val.replace(/^(the\s+)/i, '') }
      }
    }
  }
  return undefined
}

function extractDateAfter(question: string): string | undefined {
  const m = /(after|since|from)\s+(\d{4}-\d{2}-\d{2})/i.exec(question)
  if (m) return m[2]
  return undefined
}

export function generateSql(options: GenerateSqlOptions): GenerateSqlResult {
  const { question, schema } = options
  const limit = options.limit ?? 50
  const notes: string[] = []
  const q = question.trim()

  // Heuristics: pick an employee-like table if question mentions employees/staff
  const wantsEmployees = /(employee|employees|staff|people|worker)/i.test(q)

  // Desired columns for employee analytics
  const desired = [
    'department', 'dept', 'team',
    'salary', 'compensation', 'pay',
    'hire_date', 'start_date', 'join_date', 'joined_at', 'hired_at',
    'title', 'position', 'role', 'level',
    'name', 'first_name', 'last_name', 'employee_name', 'full_name'
  ]

  let table = findBestTable(schema, wantsEmployees ? desired : [])
  if (!table) {
    // fallback: pick the largest table by column count
    let best: { t?: string; n: number } = { n: -1 }
    for (const [t, cols] of Object.entries(schema)) {
      if (cols.length > best.n) best = { t, n: cols.length }
    }
    table = best.t
  }
  if (!table) {
    return { sql: 'SELECT 1 WHERE 1=0', params: [], notes: ['No tables found in schema'] }
  }

  // Resolve columns
  const salaryCol = findColumn(schema, table, ['salary', 'compensation', 'pay'])
  const deptCol = findColumn(schema, table, ['department', 'dept', 'team'])
  const titleCol = findColumn(schema, table, ['title', 'position', 'role', 'level'])
  const locationCol = findColumn(schema, table, ['location', 'city', 'country', 'region', 'office'])
  const dateCol = findColumn(schema, table, DATE_SYNONYMS)
  const nameCol = findColumn(schema, table, NAME_SYNONYMS)

  const metric = resolveMetric(q)
  const groupByKey = resolveGroupBy(q)
  const topN = extractTopN(q)
  const eqFilter = extractEqualsFilter(q)
  const dateAfter = extractDateAfter(q)

  const params: any[] = []
  let select = '*'
  let order = ''
  let where: string[] = []
  let groupBy = ''

  // Build SELECT based on metric/groupBy
  if (metric === 'count') {
    if (groupByKey) {
      const dimCol =
        (groupByKey === 'department' && deptCol) ||
        (groupByKey === 'location' && locationCol) ||
        (groupByKey === 'title' && titleCol)
      if (dimCol) {
        select = `${dimCol} AS group, COUNT(*) AS count`
        groupBy = `GROUP BY ${dimCol}`
        order = `ORDER BY count DESC`
      } else {
        select = 'COUNT(*) AS count'
      }
    } else {
      select = 'COUNT(*) AS count'
    }
  } else if (metric === 'avg') {
    if (salaryCol) {
      if (groupByKey) {
        const dimCol =
          (groupByKey === 'department' && deptCol) ||
          (groupByKey === 'location' && locationCol) ||
          (groupByKey === 'title' && titleCol)
        if (dimCol) {
          select = `${dimCol} AS group, AVG(${salaryCol}) AS average_salary`
          groupBy = `GROUP BY ${dimCol}`
          order = `ORDER BY average_salary DESC`
        } else {
          select = `AVG(${salaryCol}) AS average_salary`
        }
      } else {
        select = `AVG(${salaryCol}) AS average_salary`
      }
    } else {
      notes.push('No salary-like column found; falling back to COUNT(*)')
      select = 'COUNT(*) AS count'
    }
  } else if (metric === 'sum') {
    if (salaryCol) {
      if (groupByKey) {
        const dimCol =
          (groupByKey === 'department' && deptCol) ||
          (groupByKey === 'location' && locationCol) ||
          (groupByKey === 'title' && titleCol)
        if (dimCol) {
          select = `${dimCol} AS group, SUM(${salaryCol}) AS total_salary`
          groupBy = `GROUP BY ${dimCol}`
          order = `ORDER BY total_salary DESC`
        } else {
          select = `SUM(${salaryCol}) AS total_salary`
        }
      } else {
        select = `SUM(${salaryCol}) AS total_salary`
      }
    } else {
      notes.push('No salary-like column found; falling back to COUNT(*)')
      select = 'COUNT(*) AS count'
    }
  } else if (metric === 'salary') {
    // list rows ordered by salary desc
    if (salaryCol) {
      select = nameCol ? `${nameCol}, ${salaryCol}` : `*`
      order = `ORDER BY ${salaryCol} DESC`
    } else {
      select = '*'
    }
  } else {
    // default: list rows, maybe top N
    select = '*'
  }

  // Filters
  if (eqFilter) {
    const dimCol =
      (eqFilter.dim === 'department' && deptCol) ||
      (eqFilter.dim === 'location' && locationCol) ||
      (eqFilter.dim === 'title' && titleCol)
    if (dimCol) {
      params.push(eqFilter.value)
      where.push(`LOWER(${dimCol}) = LOWER($${params.length})`)
    }
  }
  if (dateAfter && dateCol) {
    params.push(dateAfter)
    where.push(`${dateCol} >= $${params.length}`)
  }

  // LIMIT and TOP N
  const limitVal = topN && topN > 0 ? topN : limit

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const sql = `SELECT ${select} FROM "${table}" ${whereSql} ${groupBy} ${order} LIMIT ${limitVal}`.replace(/\s+/g, ' ').trim()

  return { sql, params, chosenTable: table, notes }
}
