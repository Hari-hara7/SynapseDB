import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const start = Date.now()
  try {
    const { query } = await req.json()
    if (!query) return NextResponse.json({ error: 'No query provided' }, { status: 400 })

    // 1. Ask Gemini Flash 2.5 to classify query
    const classificationRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Classify the query as one of [SQL, DOCUMENT, HYBRID]: "${query}"`,
                },
              ],
            },
          ],
        }),
      }
    )

    const classificationData = await classificationRes.json()
    const classification =
      classificationData?.candidates?.[0]?.content?.parts?.[0]?.text || 'SQL'

  let result: any[] = []
    if (classification === 'SQL' || classification === 'HYBRID') {
      // 2. Generate SQL query using Gemini
      const sqlPrompt = `
      Given the following schema and query, generate a safe SQL query:
      Schema:
      ${JSON.stringify(await prisma.$queryRaw`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema='public'`)}
      User Query: "${query}"
      Output only SQL without explanation.
      `
      const sqlRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-exp:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: sqlPrompt }] }] }),
        }
      )

      const sqlData = await sqlRes.json()
      const sql = sqlData?.candidates?.[0]?.content?.parts?.[0]?.text || ''

      try {
        result = (await prisma.$queryRawUnsafe(sql)) as any[]
      } catch (err) {
        result = [{ error: 'Invalid or unsafe SQL generated' }]
      }
    }

    const responseTime = (Date.now() - start) / 1000
    return NextResponse.json({
      type: classification,
      response_time: `${responseTime}s`,
      structured_results: result,
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }
}
