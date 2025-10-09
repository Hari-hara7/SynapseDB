// lib/embeddings.ts
// Single clean implementation for generating embeddings using Gemini Generative Language API.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

/**
 * Generate embeddings for an array of texts using Gemini.
 * @param texts Array of strings to embed
 * @returns Array of embedding vectors (number[])
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set in environment')
  if (!texts || texts.length === 0) return []

  const payload = {
    model: 'models/embedding-001',
    contents: texts.map((t) => ({ parts: [{ text: t }] })),
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini embedding API error: ${errText}`)
  }

  const data = await res.json()

  const raw = data?.embeddings ?? data?.embedding ?? null
  if (!raw || !Array.isArray(raw)) {
    if (Array.isArray(data?.candidates)) {
      const found: number[][] = []
      for (const c of data.candidates) {
        const parts = c?.content?.parts
        if (Array.isArray(parts)) {
          for (const p of parts) {
            if (Array.isArray(p?.embedding)) found.push(p.embedding)
          }
        }
      }
      if (found.length > 0) return found
    }
    throw new Error('Invalid embedding response from Gemini')
  }

  return raw.map((item: any) => {
    if (Array.isArray(item?.embedding)) return item.embedding
    if (Array.isArray(item)) return item
    return []
  })
}
