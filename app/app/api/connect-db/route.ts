import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function POST(req: NextRequest) {
  try {
    const { connectionString } = await req.json()
    
    if (!connectionString) {
      return NextResponse.json(
        { error: 'Connection string required' },
        { status: 400 }
      )
    }

    // Test connection
    const pool = new Pool({ 
      connectionString,
      max: 1, // Only one connection for testing
      connectionTimeoutMillis: 5000 // 5 second timeout
    })

    try {
      const client = await pool.connect()
      
      // Get all tables
      const tablesQuery = `
        SELECT 
          t.table_name,
          t.table_type,
          obj_description((t.table_schema||'.'||t.table_name)::regclass, 'pg_class') as table_comment
        FROM information_schema.tables t
        WHERE t.table_schema = 'public'
        ORDER BY t.table_name
      `
      const tablesResult = await client.query(tablesQuery)

      // Get all columns with detailed info
      const columnsQuery = `
        SELECT 
          c.table_name,
          c.column_name,
          c.data_type,
          c.character_maximum_length,
          c.is_nullable,
          c.column_default,
          col_description((c.table_schema||'.'||c.table_name)::regclass, c.ordinal_position) as column_comment
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        ORDER BY c.table_name, c.ordinal_position
      `
      const columnsResult = await client.query(columnsQuery)

      // Get foreign key relationships
      const relationshipsQuery = `
        SELECT
          tc.table_name as from_table,
          kcu.column_name as from_column,
          ccu.table_name as to_table,
          ccu.column_name as to_column,
          tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      `
      const relationshipsResult = await client.query(relationshipsQuery)

      // Get primary keys
      const primaryKeysQuery = `
        SELECT
          tc.table_name,
          kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        WHERE tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      `
      const primaryKeysResult = await client.query(primaryKeysQuery)

      // Get indexes
      const indexesQuery = `
        SELECT
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `
      const indexesResult = await client.query(indexesQuery)

      // Structure the schema data
      const schema: any = {
        tables: {},
        relationships: relationshipsResult.rows,
        metadata: {
          connection_successful: true,
          total_tables: tablesResult.rows.length,
          total_relationships: relationshipsResult.rows.length
        }
      }

      // Build tables object with columns
      tablesResult.rows.forEach((table: any) => {
        schema.tables[table.table_name] = {
          name: table.table_name,
          type: table.table_type,
          comment: table.table_comment,
          columns: [],
          primary_keys: [],
          indexes: []
        }
      })

      // Add columns to tables
      columnsResult.rows.forEach((col: any) => {
        if (schema.tables[col.table_name]) {
          schema.tables[col.table_name].columns.push({
            name: col.column_name,
            type: col.data_type,
            max_length: col.character_maximum_length,
            nullable: col.is_nullable === 'YES',
            default: col.column_default,
            comment: col.column_comment
          })
        }
      })

      // Add primary keys
      primaryKeysResult.rows.forEach((pk: any) => {
        if (schema.tables[pk.table_name]) {
          schema.tables[pk.table_name].primary_keys.push(pk.column_name)
        }
      })

      // Add indexes
      indexesResult.rows.forEach((idx: any) => {
        if (schema.tables[idx.tablename]) {
          schema.tables[idx.tablename].indexes.push({
            name: idx.indexname,
            definition: idx.indexdef
          })
        }
      })

  client.release()
  await (pool as any).end?.()

      return NextResponse.json({
        success: true,
        schema,
        message: 'Successfully connected and retrieved schema'
      })

    } catch (dbError: any) {
  await (pool as any).end?.()
      return NextResponse.json(
        {
          success: false,
          error: 'Database connection failed',
          details: dbError.message
        },
        { status: 500 }
      )
    }

  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request',
        details: err.message
      },
      { status: 400 }
    )
  }
}
