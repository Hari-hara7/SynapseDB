type GenerationConfig = {
  temperature?: number
  maxOutputTokens?: number
}

export async function geminiGenerate(
  promptText: string,
  config: GenerationConfig = { temperature: 0, maxOutputTokens: 512 }
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured')

  const preferredModel = process.env.GEMINI_MODEL
  const models = [
    ...(preferredModel ? [preferredModel] : []),
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro',
    'gemini-1.5-pro-latest'
  ]

  const apiBases = ['v1', 'v1beta']

  const payload = (text: string) => ({
    generationConfig: {
      temperature: config.temperature ?? 0,
      maxOutputTokens: config.maxOutputTokens ?? 512,
    },
    contents: [
      {
        parts: [{ text }],
      },
    ],
  })

  let lastErrText = ''

  for (const base of apiBases) {
    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/${base}/models/${model}:generateContent?key=${apiKey}`
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload(promptText)),
        })

        if (!res.ok) {
          lastErrText = await res.text()
          // Try next model/version on 404 or NOT_FOUND style errors
          if (res.status === 404 || /NOT_FOUND/i.test(lastErrText)) continue
          // For invalid args (e.g., unsupported fields), still try fallbacks
          if (res.status === 400) continue
          // Other errors: throw
          throw new Error(`Gemini error ${res.status}: ${lastErrText}`)
        }

        const data = await res.json()
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        return String(text)
      } catch (err: any) {
        lastErrText = err?.message || String(err)
        // proceed to next model/base
      }
    }
  }

  throw new Error(
    `No supported Gemini model/method found for your API key/region. Last error: ${lastErrText}`
  )
}
