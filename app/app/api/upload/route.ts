// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { extname } from 'path'
import { chunkDocument } from '@/lib/document-utils'
import { generateEmbeddings } from '@/lib/embeddings'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
export const runtime = 'nodejs'

// PDF parsing is currently disabled due to compatibility issues with Next.js server
// To enable PDF support, you would need to:
// 1. Use an external service/API for PDF text extraction
// 2. Pre-convert PDFs to text before uploading
// 3. Use a Node.js child process to run pdf-parse separately
// 
// For now, we recommend converting PDFs to .txt files using tools like:
// - https://convertio.co/pdf-txt/
// - Adobe Acrobat Export PDF
// - Command line: pdftotext (part of poppler-utils)

export async function POST(req: NextRequest) {
  try {
    // Check for required environment variables
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        error: 'DATABASE_URL environment variable is not set' 
      }, { status: 500 })
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'GEMINI_API_KEY environment variable is not set' 
      }, { status: 500 })
    }

    const formData = await req.formData()
    const files = formData.getAll('files') as File[]
    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const uploadedFiles: string[] = []
    const errors: string[] = []

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const ext = extname(file.name).toLowerCase()

      // 1️⃣ Extract text
      let text = ''
      try {
        if (ext === '.pdf') {
          // PDF support temporarily disabled - suggest conversion
          throw new Error(
            'PDF parsing not supported in server environment. ' +
            'Please convert to .txt using: pdftotext (CLI), Adobe Acrobat, or online converters (pdf2txt.org)'
          )
        } else {
          text = buffer.toString('utf8')
        }
      } catch (extractError: any) {
        console.error(`Failed to extract text from ${file.name}:`, extractError)
        errors.push(`${file.name}: ${extractError.message}`)
        continue
      }

      if (!text || text.trim().length === 0) {
        console.warn(`Skipping ${file.name}: no text extracted`)
        errors.push(`${file.name}: No text could be extracted`)
        continue
      }

      // 2️⃣ Chunk the document
      const chunks = chunkDocument(text, 1000) // 1000 chars per chunk

      // 3️⃣ Generate embeddings in batch
      let embeddings: number[][]
      try {
        embeddings = await generateEmbeddings(chunks)
      } catch (embeddingError: any) {
        console.error(`Failed to generate embeddings for ${file.name}:`, embeddingError)
        errors.push(`${file.name}: Failed to generate embeddings - ${embeddingError.message}`)
        continue
      }

      // 4️⃣ Store each chunk in Postgres with pgvector
      const client = await pool.connect()
      try {
        for (let i = 0; i < chunks.length; i++) {
          const chunkText = chunks[i]
          const vector = embeddings[i]
          if (!vector || vector.length === 0) {
            console.warn(`Skipping chunk ${i} of ${file.name}: empty embedding`)
            continue
          }
          const vectorStr = '[' + vector.join(',') + ']' // pgvector literal

          // Store embedding as text for now (will migrate to vector type later)
          const insertQuery = `
            INSERT INTO "Document" (id, filename, content, embedding)
            VALUES (gen_random_uuid(), $1, $2, $3)
          `
          await client.query(insertQuery, [file.name, chunkText, vectorStr])
        }
      } catch (dbError: any) {
        console.error(`Database error for ${file.name}:`, dbError)
        errors.push(`${file.name}: Database error - ${dbError.message}`)
        throw dbError
      } finally {
        client.release()
      }

      uploadedFiles.push(file.name)
    }

    return NextResponse.json({
      status: uploadedFiles.length > 0 ? 'success' : 'failed',
      uploaded: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      totalFiles: files.length,
      successfulFiles: uploadedFiles.length,
    })
  } catch (err: any) {
    console.error('Upload failed:', err)
    return NextResponse.json({ 
      error: 'Upload failed', 
      details: err.message || String(err) 
    }, { status: 500 })
  }
}
