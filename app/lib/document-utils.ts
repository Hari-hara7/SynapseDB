// lib/document-utils.ts

/**
 * Returns a snippet of text around the query in the document.
 * If query not found, returns the first `radius` characters.
 * @param content - full document text
 * @param query - user search query
 * @param radius - number of characters around the match
 */
export function getSnippetFromContent(
  content: string,
  query: string,
  radius = 200
) {
  if (!content) return ''

  const lowerContent = content.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const idx = lowerContent.indexOf(lowerQuery)

  if (idx === -1) {
    // Query not found, return first `radius` chars
    return content.slice(0, radius) + (content.length > radius ? '...' : '')
  }

  const start = Math.max(0, idx - Math.floor(radius / 2))
  const end = Math.min(content.length, idx + Math.floor(radius / 2))

  return (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '')
}

/**
 * Optional helper to split large documents into chunks
 * preserving word boundaries for embedding storage.
 * @param text - full document text
 * @param chunkSize - max characters per chunk
 */
export function chunkDocument(text: string, chunkSize = 1000): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    let end = start + chunkSize
    if (end >= text.length) end = text.length
    else {
      // Move end back to nearest space to avoid cutting words
      while (end > start && text[end] !== ' ' && text[end] !== '\n') end--
      if (end === start) end = start + chunkSize // fallback
    }
    chunks.push(text.slice(start, end).trim())
    start = end
  }
  return chunks
}
