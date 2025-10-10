"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  CheckCircle2,
  FileType,
  Loader2,
  UploadCloud,
  X,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardGradient } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

type UploadStatus = "pending" | "uploading" | "success" | "error"

interface UploadProgress {
  fileName: string
  progress: number
  status: UploadStatus
  message?: string
  size?: number
}

const SUPPORTED_EXTENSIONS = [".txt", ".md", ".text", ".markdown", ".csv", ".docx"]

const getFileIndicator = (fileName: string) => {
  const ext = fileName.split(".").pop()?.toLowerCase()
  switch (ext) {
    case "txt":
    case "md":
    case "text":
    case "markdown":
      return {
        emoji: "📝",
        tone: "text-white/80",
        label: "Text",
      }
    case "csv":
      return {
        emoji: "📊",
        tone: "text-emerald-300",
        label: "CSV",
      }
    case "doc":
    case "docx":
      return {
        emoji: "📘",
        tone: "text-blue-300",
        label: "DOCX",
      }
    case "pdf":
      return {
        emoji: "📄",
        tone: "text-rose-300",
        label: "PDF",
      }
    default:
      return {
        emoji: "📎",
        tone: "text-white/60",
        label: "File",
      }
  }
}

const formatSize = (bytes = 0) => {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`
}

export default function EnhancedUploadPage() {
  const [files, setFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<UploadProgress[]>([])
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const upsertProgress = useCallback((fileName: string, updates: Partial<UploadProgress>) => {
    setProgress((prev) => {
      const existing = prev.find((p) => p.fileName === fileName)
      if (existing) {
        return prev.map((p) => (p.fileName === fileName ? { ...p, ...updates } : p))
      }
      return [...prev, { fileName, progress: 0, status: "pending", ...updates }]
    })
  }, [])

  const resetUploads = useCallback(() => {
    setFiles([])
    setProgress([])
    setResult(null)
    setError(null)
  }, [])

  const handleFileSelection = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || incoming.length === 0) return
      const newFiles = Array.from(incoming)
      setFiles((prev) => [...prev, ...newFiles])
      newFiles.forEach((file) =>
        upsertProgress(file.name, {
          status: "pending",
          progress: 0,
          size: file.size,
          message: "Ready to upload",
        })
      )
      setError(null)
    },
    [upsertProgress]
  )

  const handleSubmit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault()
      if (files.length === 0) {
        setError("Please select at least one file")
        return
      }

      setLoading(true)
      setError(null)
      setResult(null)

      files.forEach((file) =>
        upsertProgress(file.name, {
          status: "uploading",
          progress: 25,
          message: "Uploading…",
        })
      )

      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))

      try {
        // Use Flask backend API
        const FLASK_API_URL = process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://localhost:5000'
        const response = await fetch(`${FLASK_API_URL}/api/upload`, {
          method: "POST",
          body: formData,
        })
        const data = await response.json()

        if (response.ok) {
          setResult(data)
          data.uploaded?.forEach((fileName: string) =>
            upsertProgress(fileName, {
              status: "success",
              progress: 100,
              message: "Uploaded successfully",
            })
          )

          data.errors?.forEach((message: string) => {
            const [fileName] = message.split(":")
            upsertProgress(fileName, {
              status: "error",
              progress: 0,
              message,
            })
          })

          if (data.errors?.length) {
            setError(`Uploaded with warnings: ${data.errors.join(", ")}`)
          }
        } else {
          const failMessage = data.error || "Upload failed"
          setError(failMessage)
          files.forEach((file) =>
            upsertProgress(file.name, {
              status: "error",
              progress: 0,
              message: failMessage,
            })
          )
        }
      } catch (err: any) {
        const message = `Network error: ${err.message}. Make sure Flask server is running on port 5000.`
        setError(message)
        files.forEach((file) =>
          upsertProgress(file.name, {
            status: "error",
            progress: 0,
            message,
          })
        )
      } finally {
        setLoading(false)
      }
    },
    [files, upsertProgress]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragging(false)
      handleFileSelection(event.dataTransfer.files)
    },
    [handleFileSelection]
  )

  const hasFiles = files.length > 0
  const uploadSummary = useMemo(() => {
    const success = progress.filter((p) => p.status === "success").length
    const failed = progress.filter((p) => p.status === "error").length
    return { success, failed }
  }, [progress])

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute left-[-5%] top-[-15%] h-[420px] w-[420px] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-[-10%] bottom-[-20%] h-[520px] w-[520px] rounded-full bg-emerald-500/30 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-12 sm:px-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-white/25 hover:bg-white/10"
          >
            <ArrowUpRight className="size-4 rotate-180" /> Back to Hub
          </Link>
          <div className="text-xs uppercase tracking-[0.35em] text-white/40">
            ingest · upload · embed
          </div>
        </header>

        <main className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/15 bg-white/[0.02]">
            <CardGradient />
            <CardContent className="space-y-8">
              <div className="space-y-4">
                <Badge className="border-white/20 bg-white/10 text-white/80">
                  Upload Studio
                </Badge>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <h1 className="text-3xl font-semibold tracking-tight">
                      Rich document ingestion with real-time feedback.
                    </h1>
                    <p className="max-w-lg text-sm text-white/60">
                      Drag in source handbooks, policy docs, and spreadsheets. We chunk, embed, and index every page with progress telemetry.
                    </p>
                  </div>
                  <div className="hidden items-center justify-center rounded-2xl border border-white/15 bg-white/5 p-4 text-white/70 lg:flex">
                    <UploadCloud className="size-8" />
                  </div>
                </div>
              </div>

              <div
                onDrop={handleDrop}
                onDragLeave={() => setIsDragging(false)}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                className={`group relative flex min-h-[220px] flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 text-center transition ${
                  isDragging
                    ? "border-white/70 bg-white/10"
                    : "border-white/20 bg-white/5 hover:border-white/40"
                }`}
              >
                <input
                  ref={fileInputRef}
                  id="file-input"
                  type="file"
                  multiple
                  accept={SUPPORTED_EXTENSIONS.join(",")}
                  onChange={(event) => handleFileSelection(event.target.files)}
                  className="hidden"
                />
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-2xl">
                  📁
                </div>
                <div className="space-y-2">
                  <p className="text-lg font-medium text-white/90">
                    {isDragging ? "Drop files to upload" : "Drag & drop files here"}
                  </p>
                  <p className="text-sm text-white/50">TXT, MD, CSV, DOCX • Multiple files allowed</p>
                </div>
                <Button
                  asChild
                  className="rounded-full bg-white text-black hover:bg-white/90"
                >
                  <label htmlFor="file-input" className="cursor-pointer">
                    Browse files
                  </label>
                </Button>
              </div>

              <div className="rounded-3xl border border-amber-400/40 bg-amber-500/10 p-6 text-sm text-amber-200">
                <div className="flex items-center gap-2 text-amber-100">
                  <FileType className="size-4" /> Supported formats
                </div>
                <p className="mt-2 text-white/70">
                  Currently optimized for <span className="font-semibold text-white">.txt</span>,
                  <span className="font-semibold text-white"> .md</span>.
                  Convert PDFs using <a className="underline" href="https://pdf2txt.org" target="_blank" rel="noreferrer">pdf2txt.org</a>,
                  <span className="font-semibold"> pdftotext</span>, or <span className="font-semibold">Adobe Acrobat</span>.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/[0.03]">
            <CardGradient />
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between text-sm text-white/60">
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 className="size-4" />
                  Upload summary
                </span>
                <span>{files.length} files selected</span>
              </div>

              {hasFiles ? (
                <div className="max-h-[340px] space-y-3 overflow-y-auto pr-2">
                  {files.map((file) => {
                    const indicator = getFileIndicator(file.name)
                    const state = progress.find((p) => p.fileName === file.name)
                    return (
                      <div
                        key={file.name}
                        className="group flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"
                      >
                        <div className={indicator.tone}>{indicator.emoji}</div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1">
                              <p className="truncate text-white/90">{file.name}</p>
                              <p className="text-xs text-white/40">
                                {indicator.label} • {formatSize(file.size)}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="rounded-full border border-white/10 p-1 text-white/40 transition hover:border-white/20 hover:text-white/80"
                              onClick={() => {
                                setFiles((prev) => prev.filter((f) => f.name !== file.name))
                                setProgress((prev) => prev.filter((p) => p.fileName !== file.name))
                              }}
                              disabled={loading}
                            >
                              <X className="size-4" />
                            </button>
                          </div>
                          <Progress value={state?.progress ?? 0} status={state?.status ?? "pending"} />
                          <p
                            className={`text-xs ${
                              state?.status === "success"
                                ? "text-emerald-400"
                                : state?.status === "error"
                                ? "text-rose-400"
                                : "text-white/50"
                            }`}
                          >
                            {state?.message || "Awaiting upload"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-sm text-white/50">
                  Drop files into the panel or browse from your device to see progress here.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => handleSubmit(undefined)}
                  disabled={loading || !hasFiles}
                  className="bg-white text-black hover:bg-white/90"
                >
                  {loading ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Uploading {files.length} file(s)…
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <ArrowUpRight className="size-4" /> Upload files
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="border border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
                  disabled={!hasFiles || loading}
                  onClick={resetUploads}
                >
                  Clear queue
                </Button>
                <span className="text-xs text-white/40">
                  {uploadSummary.success} completed · {uploadSummary.failed} failed
                </span>
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
                  {error}
                </div>
              )}

              {result && (
                <Card className="border-white/10 bg-white/[0.05]">
                  <CardGradient />
                  <CardContent className="space-y-3 text-sm text-white/70">
                    <div className="flex items-center justify-between">
                      <span className="text-white/90">Upload summary</span>
                      <Badge variant="outline" className="border-white/20 text-white/60">
                        {result.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs uppercase tracking-[0.25em] text-white/40">
                      <div>
                        <p>Total</p>
                        <p className="mt-1 text-base tracking-tight text-white/80">
                          {result.totalFiles}
                        </p>
                      </div>
                      <div>
                        <p>Successful</p>
                        <p className="mt-1 text-base tracking-tight text-emerald-300">
                          {result.successfulFiles}
                        </p>
                      </div>
                    </div>
                    {result.uploaded?.length > 0 && (
                      <div className="space-y-1 text-xs text-white/50">
                        <p className="uppercase tracking-[0.3em] text-white/30">Uploaded</p>
                        <div className="space-y-1">
                          {result.uploaded.map((name: string) => (
                            <p key={name} className="flex items-center gap-2 text-emerald-200">
                              <CheckCircle2 className="size-3" /> {name}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.errors?.length > 0 && (
                      <div className="space-y-1 text-xs text-white/50">
                        <p className="uppercase tracking-[0.3em] text-white/30">Warnings</p>
                        <div className="space-y-1 text-rose-300">
                          {result.errors.map((message: string, index: number) => (
                            <p key={`${message}-${index}`}>{message}</p>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}
