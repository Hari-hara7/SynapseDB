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

  // Gemini embedding API expects a batch request with requests array
  const requests = texts.map((text) => ({
    model: 'models/text-embedding-004',
    content: {
      parts: [{ text }]
    }
  }))

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:batchEmbedContents?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
    }
  )

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini embedding API error: ${errText}`)
  }

  const data = await res.json()

  // Extract embeddings from the response
  if (data?.embeddings && Array.isArray(data.embeddings)) {
    return data.embeddings.map((item: any) => item.values || [])
  }

  throw new Error('Invalid embedding response from Gemini: ' + JSON.stringify(data))
}
