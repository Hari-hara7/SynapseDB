import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function POST(req: NextRequest) {
  try {
    const { connectionString } = await req.json()
    if (!connectionString)
      return NextResponse.json({ error: 'Connection string required' }, { status: 400 })

    const pool = new Pool({ connectionString })
    const schemaQuery = `
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
    `
    const result = await pool.query(schemaQuery)

    const schema: Record<string, string[]> = {}
    result.rows.forEach((row: any) => {
      if (!schema[row.table_name]) schema[row.table_name] = []
      schema[row.table_name].push(`${row.column_name} (${row.data_type})`)
    })

    return NextResponse.json({ status: 'success', schema })
  } catch (err: any) {
    console.error('DB connect error:', err)
    return NextResponse.json({ error: 'Failed to connect to database' }, { status: 500 })
  }
}
