// app/api/hybrid/route.ts
import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { Pool } from "pg"

import { generateEmbeddings } from "@/lib/embeddings"
import { getSnippetFromContent } from "@/lib/document-utils"
import { geminiGenerate } from "@/lib/gemini"
import { isSafeSelectSQL, sanitizeLLMSQL } from "@/lib/sql-utils"

const prisma = new PrismaClient()
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

export const runtime = 'nodejs'

const hasGemini = Boolean(process.env.GEMINI_API_KEY)

const FALLBACK_CLASSIFICATION = (query: string): "SQL" | "DOCUMENT" | "HYBRID" => {
  const lower = query.toLowerCase()
  const hasNumericIntent = /(count|sum|average|avg|compare|rate|percentage|list|top|headcount|salary|compensation|bonus)/.test(lower)
  const hasDocumentIntent = /(policy|handbook|guideline|explain|snippet|document|manual|note)/.test(lower)
  if (hasNumericIntent && hasDocumentIntent) return "HYBRID"
  if (hasNumericIntent) return "SQL"
  if (hasDocumentIntent) return "DOCUMENT"
  return "HYBRID"
}

async function askGeminiForClassification(query: string) {
  if (!hasGemini) {
    return FALLBACK_CLASSIFICATION(query)
  }
  const text = await geminiGenerate(
    `Classify this short user request into one of: SQL, DOCUMENT, HYBRID. Return only the label.

Query: "${query}"`,
    { temperature: 0, maxOutputTokens: 64 }
  )
  const label = text.trim().toUpperCase() as "SQL" | "DOCUMENT" | "HYBRID"
  if (label === "SQL" || label === "DOCUMENT" || label === "HYBRID") return label
  return FALLBACK_CLASSIFICATION(query)
}

async function askGeminiForSQL(query: string, schemaSnapshot: Record<string, string[]>) {
  if (!hasGemini) {
    throw new Error("Gemini API unavailable for SQL generation")
  }

  const prompt =
    `You are an expert SQL generator. Given the database schema (tables and columns) and a user natural language request, ` +
    `generate a single safe SQL SELECT statement that answers the user's question. Output ONLY the SQL. Do not output explanation.\n\n` +
    `Schema: ${JSON.stringify(schemaSnapshot)}\n\nUser Request: "${query}"\n\nOnly produce a read-only SELECT or WITH SELECT statement. Do not include semicolons.`

  const sql = await geminiGenerate(prompt, { temperature: 0, maxOutputTokens: 512 })
  return sql.trim()
}

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const body = await req.json()
    const userQuery: string = body.query
    const mode: 'hybrid' | 'structured' | 'documents' = body.mode || 'hybrid'
  const limit = Math.min(Math.max(Number(body.limit) || 5, 1), 20)

    if (!userQuery) {
      return NextResponse.json({ error: 'No query provided' }, { status: 400 })
    }

    // --- step 1: snapshot schema to give to LLM ---
    // Lightweight schema fetch
    const schemaRows = (await prisma.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`) as Array<{
      table_name: string
      column_name: string
    }>
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

    let generatedSQL: string | null = null
    let rawLLMSQL: string | null = null
    let documentWarning: string | null = null

    try {
      classification = await askGeminiForClassification(userQuery)
    } catch (classificationError) {
      console.warn("Gemini classification failed, using fallback", classificationError)
      classification = FALLBACK_CLASSIFICATION(userQuery)
    }

    // If mode explicitly structured or classification says SQL or HYBRID -> generate and run SQL
    if (mode === "structured" || classification === "SQL" || classification === "HYBRID") {
      try {
        rawLLMSQL = await askGeminiForSQL(userQuery, schemaSnapshot)
        generatedSQL = sanitizeLLMSQL(rawLLMSQL)
      } catch (sqlError) {
        console.warn("Gemini SQL generation unavailable", sqlError)
        generatedSQL = null
      }

      if (generatedSQL) {
        if (!isSafeSelectSQL(generatedSQL)) {
          structuredResults = [
            {
              error: "Generated SQL did not pass safety validation.",
              details: generatedSQL,
            },
          ]
        } else {
          try {
            structuredResults = (await prisma.$queryRawUnsafe(generatedSQL)) as any[]
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err)
            if (message.includes("42P01")) {
              structuredResults = [
                {
                  error: "Generated SQL referenced a table that doesn't exist in this database.",
                  hint: "If you're expecting the Document table, run an ingestion first so Prisma can create it",
                  details: message,
                },
              ]
            } else {
              structuredResults = [{ error: "Error executing generated SQL", details: message }]
            }
          }
        }
      } else if (rawLLMSQL) {
        structuredResults = [
          {
            error: "Generated SQL could not be sanitized into a single SELECT statement.",
            details: rawLLMSQL,
          },
        ]
      } else if (!hasGemini) {
        structuredResults = [
          {
            error: "LLM-driven SQL generation is disabled",
            details: "Set GEMINI_API_KEY to enable structured mode",
          },
        ]
      }
    }

    if (generatedSQL && generatedSQL !== rawLLMSQL && !structuredResults.some((row) => row?.error)) {
      // reflect sanitized SQL in logs/results even if different from raw
      console.info("Sanitized LLM SQL", { raw: rawLLMSQL, sanitized: generatedSQL })
    }

    // If mode documents or classification says DOCUMENT or HYBRID -> run vector search
    if (mode === 'documents' || classification === 'DOCUMENT' || classification === 'HYBRID') {
      if (!hasGemini) {
        documentWarning = 'Document search requires GEMINI_API_KEY for embeddings'
      } else {
        const client = await pool.connect()
        try {
          const [qEmbedding] = await generateEmbeddings([userQuery])
          const vectorStr = '[' + qEmbedding.join(',') + ']'
          const docQuery = `
            SELECT id, filename, content, metadata,
                   (embedding <=> $1::vector) as distance
            FROM "Document"
            ORDER BY distance ASC
            LIMIT $2
          `
          const { rows } = await client.query(docQuery, [vectorStr, limit])
          documentResults = rows.map((r: any) => ({
            id: r.id,
            filename: r.filename,
            snippet: getSnippetFromContent(r.content || '', userQuery, 300),
            distance: r.distance,
            metadata: r.metadata ?? null,
          }))
        } catch (vectorError: any) {
          console.error('Document embedding search failed', vectorError)
          documentWarning = vectorError?.message || 'Document search failed'
        } finally {
          client.release()
        }
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
      response_time: `${responseTime.toFixed(2)}s`,
      structured_results: structuredResults,
      document_results: documentResults,
      document_warning: documentWarning,
      sql: generatedSQL,
    })
  } catch (err: any) {
    console.error("Hybrid endpoint error", err)
    return NextResponse.json({ error: "Hybrid search failed", details: String(err) }, { status: 500 })
  }
}
