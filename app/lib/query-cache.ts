/**
 * Query Cache Manager
 * Implements in-memory caching with TTL for repeated queries
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  hits: number
}

class QueryCache {
  private cache: Map<string, CacheEntry<any>>
  private maxSize: number
  private defaultTTL: number

  constructor(maxSize = 1000, defaultTTL = 5 * 60 * 1000) {
    // 5 minutes default TTL
    this.cache = new Map()
    this.maxSize = maxSize
    this.defaultTTL = defaultTTL
  }

  /**
   * Generate cache key from query and parameters
   */
  private generateKey(query: string, params?: any): string {
    const normalized = query.trim().toLowerCase().replace(/\s+/g, " ")
    const paramsKey = params ? JSON.stringify(params) : ""
    return `${normalized}:${paramsKey}`
  }

  /**
   * Get cached result if available and not expired
   */
  get<T>(query: string, params?: any): { data: T; hit: boolean } | null {
    const key = this.generateKey(query, params)
    const entry = this.cache.get(key)

    if (!entry) {
      return null
    }

    const now = Date.now()
    const age = now - entry.timestamp

    // Check if expired
    if (age > entry.ttl) {
      this.cache.delete(key)
      return null
    }

    // Increment hit counter
    entry.hits++
    this.cache.set(key, entry)

    return {
      data: entry.data as T,
      hit: true,
    }
  }

  /**
   * Store result in cache with optional TTL
   */
  set<T>(query: string, data: T, params?: any, ttl?: number): void {
    const key = this.generateKey(query, params)

    // Evict oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    })
  }

  /**
   * Invalidate cache entries matching pattern
   */
  invalidate(pattern?: string): number {
    if (!pattern) {
      const size = this.cache.size
      this.cache.clear()
      return size
    }

    let count = 0
    const regex = new RegExp(pattern, "i")

    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key)
        count++
      }
    }

    return count
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalHits = 0
    let entries = 0
    const now = Date.now()

    for (const [, entry] of this.cache) {
      totalHits += entry.hits
      entries++
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      avgHitsPerEntry: entries > 0 ? totalHits / entries : 0,
      utilizationPercent: (this.cache.size / this.maxSize) * 100,
    }
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache) {
      const age = now - entry.timestamp
      if (age > entry.ttl) {
        this.cache.delete(key)
        removed++
      }
    }

    return removed
  }
}

// Singleton instance
export const queryCache = new QueryCache()

// Auto cleanup every 5 minutes
if (typeof window === "undefined") {
  setInterval(() => {
    queryCache.cleanup()
  }, 5 * 60 * 1000)
}
