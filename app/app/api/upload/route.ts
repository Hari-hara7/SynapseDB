// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extname } from 'path'
import { chunkDocument } from '@/lib/document-utils'
import { generateEmbeddings } from '@/lib/embeddings'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const uploadedFiles: string[] = []

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const ext = extname(file.name).toLowerCase()

      // 1️⃣ Extract text
      let text = ''
      if (ext === '.pdf') {
        const pdfParse = await import('pdf-parse')
        const data = await (pdfParse as any)(buffer)
        text = data.text
      } else {
        text = buffer.toString('utf8')
      }

      if (!text || text.trim().length === 0) continue

      // 2️⃣ Chunk the document
      const chunks = chunkDocument(text, 1000) // 1000 chars per chunk

      // 3️⃣ Generate embeddings in batch
      const embeddings = await generateEmbeddings(chunks) // returns number[][]

      // 4️⃣ Store each chunk in Postgres with pgvector
      const client = await pool.connect()
      try {
        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i]
          const vector = embeddings[i]
          const vectorStr = '[' + vector.join(',') + ']' // pgvector literal

          const insertQuery = `
            INSERT INTO "Document" (id, filename, content, embedding, uploadedAt)
            VALUES (gen_random_uuid(), $1, $2, $3::vector, NOW())
          `
          await client.query(insertQuery, [file.name, chunkText, vectorStr])
        }
      } finally {
        client.release()
      }

      uploadedFiles.push(file.name)
    }

    return NextResponse.json({
      status: 'success',
      uploaded: uploadedFiles,
      totalChunks: uploadedFiles.length > 0 ? 'Chunks stored per file' : 0,
    })
  } catch (err: any) {
    console.error('Upload failed:', err)
    return NextResponse.json({ error: 'Upload failed', details: String(err) }, { status: 500 })
  }
}
