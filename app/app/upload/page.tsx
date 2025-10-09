"use client"

import { useState } from 'react'

export default function UploadPage() {
  const [files, setFiles] = useState<FileList | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!files || files.length === 0) return
    setLoading(true)
    setError(null)
    const form = new FormData()
    Array.from(files).forEach((f) => form.append('files', f))

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (res.ok) setResult(data)
      else setError(data.error || 'Upload failed')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Upload Documents</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="file"
          multiple
          onChange={(e) => setFiles(e.target.files)}
          className=""
        />

        <div>
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>

      {error && <div className="text-red-600 mt-4">{error}</div>}

      {result && (
        <div className="mt-4">
          <h2 className="font-semibold">Result</h2>
          <pre className="bg-gray-100 p-3 rounded text-sm">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
