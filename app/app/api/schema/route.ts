import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
export const runtime = 'nodejs'

export async function GET() {
  try {
    const rows = (await prisma.$queryRaw`SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema='public'`) as any[]
    const schema: Record<string, { table: string; column: string; dataType: string }[]> = {}
    for (const r of rows) {
      const t = r.table_name as string
      if (!schema[t]) schema[t] = []
      schema[t].push({ table: t, column: r.column_name, dataType: r.data_type })
    }
    return NextResponse.json({ schema })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to fetch schema', details: String(e) }, { status: 500 })
  }
}
