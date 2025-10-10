import { NextRequest, NextResponse } from 'next/server'
import { geminiGenerate } from '@/lib/gemini'

export const runtime = 'nodejs'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

function safeParseJsonArray(text: string): string[] {
  try {
    // strip code fences if present
    const cleaned = text.trim().replace(/^```(json)?/i, '').replace(/```$/i, '').trim()
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed)) return parsed.map((x) => String(x))
  } catch {}
  // fallback: split lines/bullets
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean)
}

export async function POST(req: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const body = await req.json()
    const schema = body?.schema
    const limit = Math.max(3, Math.min(Number(body?.limit) || 10, 25))

    if (!schema) {
      return NextResponse.json(
        { error: 'schema is required in request body' },
        { status: 400 }
      )
    }

  const prompt = `You are an assistant that creates helpful, diverse natural-language query suggestions for a user interface that converts NL to SQL and/or document search.\n\nGiven this PostgreSQL schema snapshot (tables, columns, relationships) in JSON, propose ${limit} concise user questions that would be meaningful over this data.\n\nRules:\n- Output ONLY a JSON array of strings.\n- Each string is a short question the user could ask.\n- Prefer common analytics or HR/employee-style queries when applicable (headcount, salaries, departments, recent hires, attrition, etc.), but adapt to the actual table/column names you see.\n- No explanations, no markdown, no extra keys. Just the array.\n\nSchema JSON:\n${JSON.stringify(schema).slice(0, 25000)}\n`;

    const text = await geminiGenerate(prompt, { temperature: 0.2, maxOutputTokens: 512 })
    let suggestions = safeParseJsonArray(text)

    // normalize and trim to limit
    suggestions = suggestions.map((s) => s.replace(/^"|"$/g, '').trim()).filter(Boolean)
    if (suggestions.length > limit) suggestions = suggestions.slice(0, limit)

    return NextResponse.json({ success: true, suggestions })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to generate suggestions', details: err?.message || String(err) },
      { status: 500 }
    )
  }
}
