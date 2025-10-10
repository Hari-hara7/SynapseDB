import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { geminiGenerate } from '@/lib/gemini'
import { isSafeSelectSQL, sanitizeLLMSQL } from '@/lib/sql-utils'
import { generateEmbeddings } from '@/lib/embeddings'

const prisma = new PrismaClient()
export const runtime = 'nodejs'

type ColumnMeta = {
  table_name: string
  column_name: string
  data_type: string
  is_nullable: string
}

type PerformanceMetrics = {
  total_time_ms: number
  classification_time_ms: number
  sql_generation_time_ms?: number
  sql_execution_time_ms?: number
  embedding_time_ms?: number
  document_search_time_ms?: number
  cache_hit: boolean
  query_type: 'structured' | 'document' | 'hybrid'
}

export async function POST(req: NextRequest) {
  const startTime = Date.now()
  let classificationTime = 0
  let sqlGenerationTime = 0
  let sqlExecutionTime = 0
  let embeddingTime = 0
  let documentSearchTime = 0

  try {
    const body = await req.json()
    const query: string = body.query
    const limit: number = body.limit ?? 100

    if (!query?.trim()) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 })
    }

    // Step 1: Classify query intent using Gemini
    const classifyStart = Date.now()
    const classificationPrompt = `You are a query classifier for an employee analytics system. Classify the following query into one of three categories:

**Categories:**
1. "structured" - Query requires SQL database queries (e.g., employee counts, salary averages, department stats, joins)
2. "document" - Query requires document/policy search (e.g., HR policies, handbooks, guidelines, procedures)
3. "hybrid" - Query needs both SQL and document search (e.g., "show employees and their benefits policy")

**Query:** ${query}

**Response Format:** Return ONLY one word: structured, document, or hybrid`

    let queryType: 'structured' | 'document' | 'hybrid' = 'structured'
    
    try {
      const classification = await geminiGenerate(classificationPrompt, {
        temperature: 0,
        maxOutputTokens: 10,
      })
      const cleaned = classification.trim().toLowerCase()
      if (['structured', 'document', 'hybrid'].includes(cleaned)) {
        queryType = cleaned as any
      }
    } catch (err) {
      // Fallback: keyword-based classification
      const q = query.toLowerCase()
      if (/(policy|handbook|guideline|procedure|benefit|rule|regulation)/i.test(q)) {
        queryType = q.match(/(employee|salary|department|count|average)/i) ? 'hybrid' : 'document'
      } else {
        queryType = 'structured'
      }
    }

    classificationTime = Date.now() - classifyStart

    const response: any = {
      query_type: queryType,
      structured_results: null,
      document_results: null,
      sql: null,
      performance: {} as PerformanceMetrics,
    }

    // Step 2: Handle based on query type
    if (queryType === 'structured' || queryType === 'hybrid') {
      // Fetch schema
      const schemaRows = (await prisma.$queryRaw`
        SELECT table_name, column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position
      `) as ColumnMeta[]

      if (schemaRows.length === 0) {
        return NextResponse.json(
          { error: 'No tables found in public schema' },
          { status: 400 }
        )
      }

      // Group schema by table
      const tables: Record<string, any> = {}
      for (const row of schemaRows) {
        if (!tables[row.table_name]) {
          tables[row.table_name] = { table_name: row.table_name, columns: [] }
        }
        tables[row.table_name].columns.push({
          name: row.column_name,
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
        })
      }

      const tableList = Object.values(tables)
      const schemaContext = tableList
        .map((t: any) => {
          const cols = t.columns
            .map((c: any) => `  - ${c.name} (${c.type}${c.nullable ? ', nullable' : ''})`)
            .join('\n')
          return `Table: ${t.table_name}\n${cols}`
        })
        .join('\n\n')

      // Generate SQL with Gemini
      const sqlGenStart = Date.now()
      const sqlPrompt = `You are an expert PostgreSQL query generator for employee analytics. Generate a safe, optimized SQL SELECT query.

**Database Schema:**
${schemaContext}

**Rules:**
1. Generate ONLY a SELECT statement—no INSERT, UPDATE, DELETE, DROP, ALTER, etc.
2. Use double quotes for table/column names if needed
3. Use parameterized queries with $1, $2, etc. for filter values
4. Include JOINs if multiple tables are needed
5. Add GROUP BY, ORDER BY, and aggregations as appropriate
6. Limit results to ${limit} rows
7. Return ONLY the SQL query—no explanations, no markdown, no extra text
8. Use LOWER() for case-insensitive comparisons
9. For date filters, use PostgreSQL date functions

**Query:** ${query}

**Generated SQL Query:**`

      let sql = ''
      try {
        const geminiSql = await geminiGenerate(sqlPrompt, {
          temperature: 0.1,
          maxOutputTokens: 1024,
        })
        const sanitized = sanitizeLLMSQL(geminiSql)
        if (!sanitized) throw new Error('Failed to extract SQL')
        sql = sanitized
      } catch (sqlErr: any) {
        return NextResponse.json(
          { error: `SQL generation failed: ${sqlErr.message}` },
          { status: 500 }
        )
      }

      sqlGenerationTime = Date.now() - sqlGenStart
      response.sql = sql

      // Validate safety
      if (!isSafeSelectSQL(sql)) {
        return NextResponse.json(
          { error: 'Generated SQL contains unsafe operations', sql },
          { status: 400 }
        )
      }

      // Execute SQL
      const sqlExecStart = Date.now()
      try {
        const results = await prisma.$queryRawUnsafe(sql)
        response.structured_results = Array.isArray(results) ? results : []
        sqlExecutionTime = Date.now() - sqlExecStart
      } catch (execErr: any) {
        response.structured_error = String(execErr.message || execErr)
        if (execErr.code === '42P01') {
          response.structured_error = 'Table not found. The query references a non-existent table.'
        }
      }
    }

    // Step 3: Document search for document or hybrid queries
    if (queryType === 'document' || queryType === 'hybrid') {
      const embeddingStart = Date.now()
      let embedding: number[] | null = null
      
      try {
        const embeddings = await generateEmbeddings([query])
        embedding = embeddings[0] || null
        embeddingTime = Date.now() - embeddingStart
      } catch (embErr) {
        response.document_warning = 'Embedding generation unavailable; document search skipped'
      }

      if (embedding) {
        const docSearchStart = Date.now()
        try {
          const embeddingStr = `[${embedding.join(',')}]`
          const docs = await prisma.$queryRaw<any[]>`
            SELECT 
              id,
              content,
              metadata,
              (embedding <=> ${embeddingStr}::vector) AS distance
            FROM "Document"
            ORDER BY distance ASC
            LIMIT 5
          `
          response.document_results = docs.map((d) => ({
            id: d.id,
            content: d.content?.substring(0, 500) || '',
            metadata: d.metadata,
            similarity: 1 - parseFloat(d.distance),
          }))
          documentSearchTime = Date.now() - docSearchStart
        } catch (docErr: any) {
          response.document_warning = 'Document search failed; table may not exist'
        }
      }
    }

    // Step 4: Build performance metrics
    const totalTime = Date.now() - startTime
    response.performance = {
      total_time_ms: totalTime,
      classification_time_ms: classificationTime,
      sql_generation_time_ms: sqlGenerationTime || undefined,
      sql_execution_time_ms: sqlExecutionTime || undefined,
      embedding_time_ms: embeddingTime || undefined,
      document_search_time_ms: documentSearchTime || undefined,
      cache_hit: false, // TODO: implement caching
      query_type: queryType,
    }

    return NextResponse.json(response)
  } catch (err: any) {
    console.error('Smart query error:', err)
    return NextResponse.json(
      { error: 'Query processing failed', details: String(err.message || err) },
      { status: 500 }
    )
  }
}
