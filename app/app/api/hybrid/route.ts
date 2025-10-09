// app/api/hybrid/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { generateEmbeddings } from '@/lib/embeddings'
import { isSafeSelectSQL } from '@/lib/sql-utils'
import { getSnippetFromContent } from '@/lib/document-utils'

const prisma = new PrismaClient()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!

export const runtime = 'nodejs'

async function askGeminiForClassification(query: string) {
  // Optional: classify. Here not strictly required as we'll run both if hybrid.
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temperature: 0,
        maxOutputTokens: 256,
        contents: [
          {
            parts: [
              {
                text: `Classify this short user request into one of: SQL, DOCUMENT, HYBRID. Return only the label.\n\nQuery: "${query}"`,
              },
            ],
          },
        ],
      }),
    }
  )
  const data = await res.json()
  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toUpperCase() ??
    'SQL'
  )
}

async function askGeminiForSQL(query: string, schemaSnapshot: any) {
  // Provide schema snapshot and user query to Gemini to generate SQL
  const prompt = [
    {
      parts: [
        {
          text:
            `You are an expert SQL generator. Given the database schema (tables and columns) and a user natural language request, ` +
            `generate a single safe SQL SELECT statement that answers the user's question. Output ONLY the SQL. Do not output explanation.\n\n` +
            `Schema: ${JSON.stringify(schemaSnapshot)}\n\nUser Request: "${query}"\n\nOnly produce a read-only SELECT or WITH SELECT statement. Do not include semicolons.`,
        },
      ],
    },
  ]

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-exp:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        temperature: 0,
        maxOutputTokens: 512,
        contents: prompt,
      }),
    }
  )

  const data = await res.json()
  const sql = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return sql.trim()
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const body = await req.json()
    const userQuery: string = body.query
    const mode: 'hybrid' | 'structured' | 'documents' = body.mode || 'hybrid'
    const limit = body.limit || 5

    if (!userQuery) {
      return NextResponse.json({ error: 'No query provided' }, { status: 400 })
    }

    // --- step 1: snapshot schema to give to LLM ---
    // Lightweight schema fetch
  const schemaRows = (await prisma.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'`) as any[]
    // Format snapshot into object
    const schemaSnapshot: Record<string, string[]> = {}
    schemaRows.forEach((r: any) => {
      const t = r.table_name
      if (!schemaSnapshot[t]) schemaSnapshot[t] = []
      schemaSnapshot[t].push(r.column_name)
    })

    // Prepare return containers
    let structuredResults: any[] = []
    let documentResults: any[] = []
    let classification = 'HYBRID'

    // Optionally get classification (comment out if you want to always run both)
    try {
      classification = await askGeminiForClassification(userQuery)
    } catch (e) {
      classification = 'HYBRID'
    }

    // If mode explicitly structured or classification says SQL or HYBRID -> generate and run SQL
    if (mode === 'structured' || classification === 'SQL' || classification === 'HYBRID') {
      const sql = await askGeminiForSQL(userQuery, schemaSnapshot)
      // validate
      if (!isSafeSelectSQL(sql)) {
        structuredResults = [{ error: 'Generated SQL is unsafe or not a single SELECT. Aborted.' }]
      } else {
        try {
          // Use prisma raw for SELECTs
          structuredResults = (await prisma.$queryRawUnsafe(sql)) as any[]
        } catch (err) {
          structuredResults = [{ error: 'Error executing generated SQL', details: String(err) }]
        }
      }
    }

    // If mode documents or classification says DOCUMENT or HYBRID -> run vector search
    if (mode === 'documents' || classification === 'DOCUMENT' || classification === 'HYBRID') {
      // 1. Generate embedding for query
      const [qEmbedding] = await generateEmbeddings([userQuery]) // returns number[][]
      // 2. Run pgvector similarity search
      // We assume `Document` table has `id, filename, content, embedding` where embedding is pgvector
      const client = await pool.connect()
      try {
        // Use parameterized query: pass embedding vector as array to SQL - pg supports vector literal: ARRAY[...]::vector
        // But pgvector supports passing vector via parameter as bytea? Simpler: use vector literal '[]' if small; better approach is to use pg-format
        // We'll use the `<=>` operator: embedding <=> '[values]'::vector
        const vectorStr = '[' + qEmbedding.join(',') + ']'
        const docQuery = `
          SELECT id, filename, content, metadata,
                 (embedding <=> $1::vector) as distance
          FROM "Document"
          ORDER BY distance ASC
          LIMIT $2
        `
        // Note: `$1` must be a vector literal like '[0.1,0.2]'::vector - we supply string representation
        const { rows } = await client.query(docQuery, [vectorStr, limit])
        // Map and extract snippet
        documentResults = rows.map((r: any) => ({
          id: r.id,
          filename: r.filename,
          snippet: getSnippetFromContent(r.content || '', userQuery, 300),
          distance: r.distance,
          metadata: r.metadata ?? null,
        }))
      } finally {
        client.release()
      }
    }

    const responseTime = (Date.now() - start) / 1000

    // Optionally: log the query in QueryLog (Prisma)
    try {
      await prisma.queryLog.create({
        data: {
          query: userQuery,
          type: classification,
          responseTime,
          cacheHit: false,
        },
      })
    } catch (e) {
      // ignore logging errors
    }

    return NextResponse.json({
      type: classification,
      mode,
      response_time: `${responseTime}s`,
      structured_results: structuredResults,
      document_results: documentResults,
    })
  } catch (err: any) {
    console.error('Hybrid endpoint error', err)
    return NextResponse.json({ error: 'Hybrid search failed', details: String(err) }, { status: 500 })
  }
}
