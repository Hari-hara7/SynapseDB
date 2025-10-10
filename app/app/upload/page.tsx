"use client"

import Link from "next/link"
import { useMemo, useRef, useState, type DragEvent } from "react"
import { AlertTriangle, Check, FileText, Loader2, Sparkles, Trash, Upload, Wand2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardGradient } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface UploadProgress {
  fileName: string
  progress: number
  status: "pending" | "uploading" | "success" | "error"
  message?: string
}

const acceptedExtensions = [".txt", ".md", ".text", ".markdown"]

export default function UploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const dedupeFiles = (incoming: File[]) => {
    const existing = new Set(files.map((file) => `${file.name}-${file.size}`))
    return incoming.filter((file) => !existing.has(`${file.name}-${file.size}`))
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = dedupeFiles(Array.from(event.target.files))
      if (!newFiles.length) return
      setFiles((prev) => [...prev, ...newFiles])
      setError(null)
      initializeProgress(newFiles)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      const newFiles = dedupeFiles(Array.from(event.dataTransfer.files))
      if (!newFiles.length) return
      setFiles((prev) => [...prev, ...newFiles])
      setError(null)
      initializeProgress(newFiles)
    }
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
    setUploadProgress((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    setFiles([])
    setUploadProgress([])
    setResult(null)
    setError(null)
  }

  const initializeProgress = (newFiles: File[]) => {
    const progress: UploadProgress[] = newFiles.map((file) => ({
      fileName: file.name,
      progress: 0,
      status: "pending",
    }))
    setUploadProgress((prev) => [...prev, ...progress])
  }

  const setAllProgress = (updates: Partial<UploadProgress>) => {
    setUploadProgress((prev) => prev.map((entry) => ({ ...entry, ...updates })))
  }

  const updateProgress = (fileName: string, updates: Partial<UploadProgress>) => {
    setUploadProgress((prev) => prev.map((entry) => (entry.fileName === fileName ? { ...entry, ...updates } : entry)))
  }

  const handleSubmit = async (event?: React.FormEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!files || files.length === 0) {
      setError("Please select at least one file")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)

    setAllProgress({ status: "uploading", progress: 12, message: "Uploading" })

    const form = new FormData()
    files.forEach((file) => form.append("files", file))

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form })
      const data = await res.json()

      if (res.ok) {
        setResult(data)
        setAllProgress({ status: "success", progress: 100, message: "Uploaded" })
        if (data.errors && data.errors.length > 0) {
          setError(`Uploaded with warnings: ${data.errors.join(", ")}`)
          data.errors.forEach((warning: string) => {
            files.forEach((file) => {
              if (warning.includes(file.name)) {
                updateProgress(file.name, { status: "error", message: warning })
              }
            })
          })
        }
      } else {
        setError(data.error || "Upload failed")
        setAllProgress({ status: "error", progress: 100, message: data.error || "Upload failed" })
        if (data.details) {
          console.error("Upload error details:", data.details)
        }
      }
    } catch (error: any) {
      const message = `Network error: ${error.message}`
      setError(message)
      setAllProgress({ status: "error", progress: 100, message })
    } finally {
      setLoading(false)
    }
  }

  const acceptedList = useMemo(() => acceptedExtensions.join(", "), [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-80">
        <div className="absolute left-[-20%] top-[-25%] h-[500px] w-[500px] rounded-full bg-fuchsia-400/15 blur-3xl" />
        <div className="absolute bottom-[-30%] right-[-20%] h-[540px] w-[540px] rounded-full bg-white/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-12 px-6 pb-24 pt-12 sm:px-10">
        <header className="space-y-4">
          <Badge className="border-white/20 bg-white/10 text-white/70">Document ingestion</Badge>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              Drop policy files, get embeddings in one pass.
            </h1>
            <p className="max-w-3xl text-sm text-white/60">
              SynapseDB extracts clean text chunks, stores vector signatures, and primes semantic search across your employee handbook, onboarding docs, and retro notes.
            </p>
          </div>
        </header>

        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className={cn("border-white/10 bg-white/[0.02] transition", isDragging && "border-white/40 bg-white/[0.04]")}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragLeave={handleDragLeave}
          >
            <CardGradient className={cn(isDragging && "opacity-100")}/>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 text-center sm:text-left">
                <div className="flex items-center gap-3 text-white/80">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/10">
                    <Upload className="size-5" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white">Ingress console</p>
                    <p className="text-xs text-white/50">Drag and drop or browse to ingest.</p>
                  </div>
                </div>
                <div
                  className={cn(
                    "flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/15 bg-white/5 p-10 text-sm text-white/60 transition",
                    isDragging && "border-white/40 bg-white/10 text-white/80"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                >
                  <Sparkles className="size-6 text-white/50" />
                  <div className="space-y-1 text-center">
                    <p className="text-base font-medium text-white">Drop files anywhere</p>
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">or click to browse</p>
                  </div>
                  <p className="text-xs text-white/40">Accepted: {acceptedList}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={acceptedList}
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="submit"
                    disabled={loading || files.length === 0}
                    className="h-11 min-w-[160px] bg-white text-black hover:bg-white/90"
                  >
                    {loading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" /> Uploading…
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2">
                        <Upload className="size-4" /> Start upload
                      </span>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    Add more files
                  </Button>
                  {files.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={clearAll}
                      className="border border-white/10 bg-white/5 text-white/60 hover:text-white"
                    >
                      Clear queue
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Queue</p>
                  {files.length > 0 ? (
                    <div className="space-y-3">
                      {files.map((file, index) => {
                        const progress = uploadProgress[index]
                        return (
                          <div
                            key={`${file.name}-${file.size}-${index}`}
                            className="rounded-2xl border border-white/10 bg-white/5 p-4"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-white/80">
                              <div className="flex items-center gap-3">
                                <FileText className="size-4 text-white/60" />
                                <div>
                                  <p className="font-medium text-white">{file.name}</p>
                                  <p className="text-xs text-white/40">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs uppercase tracking-[0.25em] text-white/40">
                                  {progress?.status === "success" && "Ready"}
                                  {progress?.status === "pending" && "Pending"}
                                  {progress?.status === "uploading" && "Uploading"}
                                  {progress?.status === "error" && "Issue"}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  onClick={() => removeFile(index)}
                                  className="size-8 rounded-full border border-white/15 bg-transparent text-white/50 hover:text-white"
                                >
                                  <Trash className="size-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  progress?.status === "error" ? "bg-red-500" : "bg-white"
                                )}
                                style={{ width: `${progress?.progress ?? 0}%` }}
                              />
                            </div>
                            {progress?.message && (
                              <p className={cn(
                                "mt-2 text-xs",
                                progress.status === "error" ? "text-red-300" : "text-white/50"
                              )}>
                                {progress.message}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center text-sm text-white/40">
                      Queue empty. Drop .txt or .md files to get started.
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardGradient />
            <CardContent className="space-y-6">
              <div className="flex items-center gap-3 text-white/80">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/5">
                  <AlertTriangle className="size-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">PDF support paused</p>
                  <p className="text-xs text-white/50">Convert to text for the cleanest ingestion.</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-white/60">
                <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
                  PDF parsing requires browser APIs not available on the server. Convert PDFs to .txt using <strong>pdftotext</strong>, <strong>Adobe Acrobat</strong>, or <Link href="https://pdf2txt.org" className="underline">pdf2txt.org</Link>.
                </p>
                <div className="grid gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">Best practices</p>
                    <ul className="mt-3 space-y-2 text-xs text-white/60">
                      <li>• Keep files under 5MB for fastest chunking.</li>
                      <li>• Use UTF-8 encoding to preserve special characters.</li>
                      <li>• Group related policies into a single markdown file.</li>
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">Need structure?</p>
                    <p className="mt-3 text-xs text-white/60">
                      Combine document ingestion with <Link href="/hybrid" className="underline">Hybrid Query</Link> to align structured columns and embeddings for richer answers.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/15 p-4 text-sm text-red-200">
                  {error}
                </div>
              )}

              {result && (
                <div className="space-y-4 rounded-2xl border border-white/15 bg-white/5 p-5">
                  <div className="flex items-center gap-2 text-white">
                    <Check className="size-4 text-emerald-300" />
                    <span className="text-sm font-semibold">Upload summary</span>
                  </div>
                  <div className="grid gap-2 text-xs text-white/65">
                    <p><span className="text-white/40">Status:</span> {result.status}</p>
                    <p><span className="text-white/40">Total Files:</span> {result.totalFiles}</p>
                    <p><span className="text-white/40">Successful:</span> {result.successfulFiles}</p>
                  </div>
                  {result.uploaded && result.uploaded.length > 0 && (
                    <div className="space-y-2 text-xs text-white/65">
                      <p className="text-white/40">Uploaded files</p>
                      <ul className="space-y-1">
                        {result.uploaded.map((name: string, index: number) => (
                          <li key={`${name}-${index}`} className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                            {name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {result.errors && result.errors.length > 0 && (
                    <div className="space-y-2 text-xs text-amber-200">
                      <p className="text-white/40">Warnings</p>
                      <ul className="space-y-1">
                        {result.errors.map((warning: string, index: number) => (
                          <li key={`${warning}-${index}`} className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px]">
                            {warning}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
                <p className="uppercase tracking-[0.3em] text-white/35">Pro tip</p>
                <p className="mt-3 flex items-center gap-2 text-white/60">
                  <Wand2 className="size-3 text-white/50" /> Add semantic tags or headings inside markdown to improve snippet relevance.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="mt-auto flex flex-col gap-3 border-t border-white/10 pt-8 text-xs uppercase tracking-[0.3em] text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <span>Files are deleted after embedding completes</span>
          <span className="flex items-center gap-2">
            <Sparkles className="size-3" /> SynapseDB ingestion core
          </span>
        </footer>
      </div>
    </div>
  )
}
