import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { geminiGenerate } from '@/lib/gemini'

const prisma = new PrismaClient()
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const partial: string = body.partial || ''

    if (!partial || partial.length < 3) {
      return NextResponse.json({ suggestions: [] })
    }

    // Fetch schema context for better suggestions
    const schemaRows = (await prisma.$queryRaw`
      SELECT DISTINCT table_name
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `) as Array<{ table_name: string }>

    const tables = schemaRows.map((r) => r.table_name).join(', ')

    // Generate suggestions with Gemini
    const prompt = `You are an auto-complete assistant for an employee analytics query system. Given a partial query, suggest 5 complete queries that make sense.

**Available Tables:** ${tables}

**Partial Query:** ${partial}

**Rules:**
1. Return EXACTLY 5 query suggestions, one per line
2. Each suggestion should be a complete, natural language question
3. Focus on employee analytics: salaries, departments, performance, hiring, etc.
4. Make suggestions specific and actionable
5. DO NOT include numbering, bullets, or any formatting—just plain text
6. Each suggestion on a new line

**Suggestions:**`

    try {
      const response = await geminiGenerate(prompt, {
        temperature: 0.7,
        maxOutputTokens: 512,
      })

      const suggestions = response
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.match(/^\d+\./))
        .slice(0, 5)

      return NextResponse.json({ suggestions })
    } catch (geminiErr) {
      // Fallback: static suggestions based on partial match
      const fallbackSuggestions = [
        'Show average salary by department',
        'List top 10 highest-paid employees',
        'Count employees by location',
        'Find employees hired in the last 6 months',
        'Compare salaries between remote and office employees',
      ].filter((s) => s.toLowerCase().includes(partial.toLowerCase()))

      return NextResponse.json({
        suggestions: fallbackSuggestions.length > 0 ? fallbackSuggestions : [
          'Show all employees in Sales department',
          'Calculate average tenure by role',
          'List managers with their direct reports',
          'Show salary distribution by title',
          'Find employees with benefits eligibility',
        ],
      })
    }
  } catch (err: any) {
    console.error('Suggestions error:', err)
    return NextResponse.json({ suggestions: [] })
  }
}
