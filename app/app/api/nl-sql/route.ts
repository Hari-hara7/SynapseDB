import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { generateSql, TableSchema } from '@/lib/nl-sql'
import { isSafeSelectSQL } from '@/lib/sql-utils'

const prisma = new PrismaClient()
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const question: string = body.question
    const execute: boolean = Boolean(body.execute)
    const limit: number | undefined = body.limit

    if (!question) return NextResponse.json({ error: 'Missing question' }, { status: 400 })

    // Fetch lightweight schema
    const rows = (await prisma.$queryRaw`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public'`) as any[]
    const schema: TableSchema = {}
    for (const r of rows) {
      const t = r.table_name as string
      if (!schema[t]) schema[t] = []
      schema[t].push({ table: t, column: r.column_name, dataType: r.data_type })
    }

    const { sql, params, chosenTable, notes } = generateSql({ question, schema, limit })

    const response: any = { sql, params, table: chosenTable, notes }

    if (execute) {
      if (!isSafeSelectSQL(sql)) {
        return NextResponse.json({ ...response, error: 'Unsafe SQL generated; not executing.' }, { status: 400 })
      }
      try {
        const results = (await prisma.$queryRawUnsafe(sql, ...params)) as any[]
        return NextResponse.json({ ...response, results })
      } catch (e: any) {
        return NextResponse.json({ ...response, execError: String(e) }, { status: 200 })
      }
    }

    return NextResponse.json(response)
  } catch (e: any) {
    return NextResponse.json({ error: 'NL-SQL failed', details: String(e) }, { status: 500 })
  }
}
