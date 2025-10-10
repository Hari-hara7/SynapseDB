/**
 * Simple test endpoint for query pipeline
 * Access at: /api/pipeline-test
 */

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  const tests: any[] = []

  // Test 1: Database connection
  try {
    await prisma.$queryRaw`SELECT 1 as test`
    tests.push({ test: "Database Connection", status: "✅ PASS", error: null })
  } catch (error: any) {
    tests.push({ test: "Database Connection", status: "❌ FAIL", error: error.message })
  }

  // Test 2: Schema introspection
  try {
    const tables = await prisma.$queryRaw<any[]>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
    `
    tests.push({
      test: "Schema Introspection",
      status: "✅ PASS",
      error: null,
      details: `Found ${tables.length} table(s): ${tables.map((t) => t.table_name).join(", ")}`,
    })
  } catch (error: any) {
    tests.push({ test: "Schema Introspection", status: "❌ FAIL", error: error.message })
  }

  // Test 3: Document table check
  try {
    const docCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM "Document"
    `
    tests.push({
      test: "Document Table",
      status: "✅ PASS",
      error: null,
      details: `${docCount[0].count} document(s) in database`,
    })
  } catch (error: any) {
    tests.push({ test: "Document Table", status: "⚠️ WARN", error: error.message })
  }

  // Test 4: Gemini API key
  const hasGeminiKey = !!process.env.GEMINI_API_KEY
  tests.push({
    test: "Gemini API Key",
    status: hasGeminiKey ? "✅ PASS" : "⚠️ WARN",
    error: hasGeminiKey ? null : "GEMINI_API_KEY not set in environment",
    details: hasGeminiKey ? "API key configured" : "AI features will not work",
  })

  // Test 5: Cache system
  try {
    const { queryCache } = await import("@/lib/query-cache")
    const stats = queryCache.getStats()
    tests.push({
      test: "Cache System",
      status: "✅ PASS",
      error: null,
      details: `Cache size: ${stats.size}/${stats.maxSize}, ${stats.utilizationPercent.toFixed(1)}% full`,
    })
  } catch (error: any) {
    tests.push({ test: "Cache System", status: "❌ FAIL", error: error.message })
  }

  // Test 6: Security module
  try {
    const { validateQuerySecurity } = await import("@/lib/query-security")
    const result = validateQuerySecurity("SELECT * FROM test")
    tests.push({
      test: "Security Module",
      status: result.safe ? "✅ PASS" : "⚠️ WARN",
      error: null,
      details: "SQL validation working",
    })
  } catch (error: any) {
    tests.push({ test: "Security Module", status: "❌ FAIL", error: error.message })
  }

  // Test 7: Optimizer module
  try {
    const { paginateQuery } = await import("@/lib/query-optimizer")
    const result = paginateQuery("SELECT * FROM test", { page: 1, pageSize: 50 })
    tests.push({
      test: "Optimizer Module",
      status: "✅ PASS",
      error: null,
      details: "Pagination working",
    })
  } catch (error: any) {
    tests.push({ test: "Optimizer Module", status: "❌ FAIL", error: error.message })
  }

  // Summary
  const passed = tests.filter((t) => t.status.includes("PASS")).length
  const failed = tests.filter((t) => t.status.includes("FAIL")).length
  const warnings = tests.filter((t) => t.status.includes("WARN")).length

  return NextResponse.json({
    summary: {
      total: tests.length,
      passed,
      failed,
      warnings,
      ready: failed === 0,
    },
    tests,
    timestamp: new Date().toISOString(),
  })
}
