/**
 * Query Pipeline Test Examples
 * 
 * These are example test cases demonstrating how to test each layer
 * of the production query pipeline.
 */

import { describe, test, expect, beforeEach } from '@jest/globals'
import { queryCache } from '@/lib/query-cache'
import { 
  detectSQLInjection, 
  enforceReadOnly, 
  validateQuerySecurity,
  rateLimiter 
} from '@/lib/query-security'
import { 
  paginateQuery, 
  optimizeQuery, 
  estimateQueryCost 
} from '@/lib/query-optimizer'

// ============================================
// CACHE TESTS
// ============================================

describe('Query Cache', () => {
  beforeEach(() => {
    queryCache.invalidate() // Clear cache before each test
  })

  test('should cache and retrieve results', () => {
    const query = 'SELECT * FROM users'
    const data = [{ id: 1, name: 'Alice' }]

    // Store in cache
    queryCache.set(query, data)

    // Retrieve from cache
    const cached = queryCache.get(query)
    expect(cached).not.toBeNull()
    expect(cached?.data).toEqual(data)
    expect(cached?.hit).toBe(true)
  })

  test('should return null for cache miss', () => {
    const result = queryCache.get('nonexistent query')
    expect(result).toBeNull()
  })

  test('should expire entries after TTL', async () => {
    const query = 'SELECT * FROM users'
    const data = { test: true }

    // Store with 100ms TTL
    queryCache.set(query, data, undefined, 100)

    // Should be available immediately
    expect(queryCache.get(query)).not.toBeNull()

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150))

    // Should be expired
    expect(queryCache.get(query)).toBeNull()
  })

  test('should track cache hits', () => {
    const query = 'SELECT * FROM users'
    queryCache.set(query, { test: true })

    // Access multiple times
    queryCache.get(query)
    queryCache.get(query)
    queryCache.get(query)

    const stats = queryCache.getStats()
    expect(stats.totalHits).toBeGreaterThan(0)
  })

  test('should evict oldest entries when full', () => {
    const smallCache = new (queryCache.constructor as any)(5) // Max 5 entries

    // Fill cache
    for (let i = 0; i < 6; i++) {
      smallCache.set(`query-${i}`, { id: i })
    }

    // First entry should be evicted
    expect(smallCache.get('query-0')).toBeNull()
    // Last entry should exist
    expect(smallCache.get('query-5')).not.toBeNull()
  })
})

// ============================================
// SECURITY TESTS
// ============================================

describe('SQL Injection Detection', () => {
  test('should detect command execution attempts', () => {
    const dangerous = 'SELECT * FROM users; EXEC xp_cmdshell "dir"'
    const result = detectSQLInjection(dangerous)
    
    expect(result.safe).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  test('should detect union-based injection', () => {
    const injection = "SELECT * FROM users WHERE id = 1 UNION SELECT password FROM admin"
    const result = detectSQLInjection(injection)
    
    expect(result.safe).toBe(false)
  })

  test('should detect boolean-based blind injection', () => {
    const injection = "SELECT * FROM users WHERE id = 1 OR '1'='1'"
    const result = detectSQLInjection(injection)
    
    expect(result.safe).toBe(false)
  })

  test('should allow safe queries', () => {
    const safe = "SELECT name, email FROM users WHERE department = 'Engineering'"
    const result = detectSQLInjection(safe)
    
    expect(result.safe).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('should warn about information_schema access', () => {
    const query = "SELECT * FROM information_schema.tables"
    const result = detectSQLInjection(query)
    
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})

describe('Read-Only Enforcement', () => {
  test('should block INSERT statements', () => {
    const query = "INSERT INTO users (name) VALUES ('Alice')"
    const result = enforceReadOnly(query)
    
    expect(result.safe).toBe(false)
    expect(result.errors).toContain('Write operation not allowed: INSERT')
  })

  test('should block UPDATE statements', () => {
    const query = "UPDATE users SET name = 'Bob' WHERE id = 1"
    const result = enforceReadOnly(query)
    
    expect(result.safe).toBe(false)
  })

  test('should block DELETE statements', () => {
    const query = "DELETE FROM users WHERE id = 1"
    const result = enforceReadOnly(query)
    
    expect(result.safe).toBe(false)
  })

  test('should block DROP statements', () => {
    const query = "DROP TABLE users"
    const result = enforceReadOnly(query)
    
    expect(result.safe).toBe(false)
  })

  test('should allow SELECT statements', () => {
    const query = "SELECT * FROM users"
    const result = enforceReadOnly(query)
    
    expect(result.safe).toBe(true)
  })

  test('should allow CTEs (WITH clause)', () => {
    const query = `
      WITH ranked_users AS (
        SELECT *, ROW_NUMBER() OVER (ORDER BY created_at) as rn
        FROM users
      )
      SELECT * FROM ranked_users WHERE rn <= 10
    `
    const result = enforceReadOnly(query)
    
    expect(result.safe).toBe(true)
  })
})

describe('Comprehensive Security Validation', () => {
  test('should validate safe query completely', () => {
    const query = "SELECT id, name FROM users WHERE department = 'Sales'"
    const result = validateQuerySecurity(query)
    
    expect(result.safe).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('should catch multiple security issues', () => {
    const query = "SELECT * FROM users; DROP TABLE employees; --"
    const result = validateQuerySecurity(query)
    
    expect(result.safe).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })
})

describe('Rate Limiting', () => {
  beforeEach(() => {
    rateLimiter.reset('test-user')
  })

  test('should allow requests within limit', () => {
    for (let i = 0; i < 10; i++) {
      expect(rateLimiter.isAllowed('test-user')).toBe(true)
    }
  })

  test('should block requests exceeding limit', () => {
    // Configure low limit for testing
    const testLimiter = new (rateLimiter.constructor as any)(5, 60000)
    
    // Use up all requests
    for (let i = 0; i < 5; i++) {
      testLimiter.isAllowed('test-user')
    }
    
    // Next request should be blocked
    expect(testLimiter.isAllowed('test-user')).toBe(false)
  })

  test('should track remaining requests', () => {
    const testLimiter = new (rateLimiter.constructor as any)(10, 60000)
    
    testLimiter.isAllowed('test-user')
    testLimiter.isAllowed('test-user')
    
    const remaining = testLimiter.getRemainingRequests('test-user')
    expect(remaining).toBe(8)
  })
})

// ============================================
// OPTIMIZATION TESTS
// ============================================

describe('Query Pagination', () => {
  test('should add LIMIT and OFFSET', () => {
    const sql = 'SELECT * FROM users'
    const result = paginateQuery(sql, { page: 1, pageSize: 50 })
    
    expect(result.sql).toContain('LIMIT 50')
    expect(result.sql).toContain('OFFSET 0')
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 50,
      offset: 0,
      limit: 50
    })
  })

  test('should calculate correct offset for page 2', () => {
    const sql = 'SELECT * FROM users'
    const result = paginateQuery(sql, { page: 2, pageSize: 25 })
    
    expect(result.sql).toContain('LIMIT 25')
    expect(result.sql).toContain('OFFSET 25')
  })

  test('should cap page size at 1000', () => {
    const sql = 'SELECT * FROM users'
    const result = paginateQuery(sql, { page: 1, pageSize: 5000 })
    
    expect(result.sql).toContain('LIMIT 1000')
    expect(result.hints).toContain('Page size capped at 1000 rows for performance')
  })

  test('should generate count query', () => {
    const sql = 'SELECT * FROM users WHERE active = true'
    const result = paginateQuery(sql, { page: 1, pageSize: 50 })
    
    expect(result.countSql).toContain('SELECT COUNT(*)')
    expect(result.countSql).toContain('FROM (SELECT * FROM users WHERE active = true)')
  })
})

describe('Query Cost Estimation', () => {
  test('should estimate low cost for simple SELECT', () => {
    const sql = 'SELECT * FROM users'
    const result = estimateQueryCost(sql)
    
    expect(result.cost).toBe('low')
  })

  test('should estimate medium cost for queries with JOINs', () => {
    const sql = `
      SELECT u.*, d.name as dept_name
      FROM users u
      JOIN departments d ON u.dept_id = d.id
      WHERE u.active = true
    `
    const result = estimateQueryCost(sql)
    
    expect(result.cost).toBe('medium')
    expect(result.factors).toContain('1 JOIN(s)')
  })

  test('should estimate high cost for complex queries', () => {
    const sql = `
      SELECT DISTINCT u.name, COUNT(*) as total
      FROM users u
      JOIN departments d ON u.dept_id = d.id
      JOIN projects p ON u.id = p.user_id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE u.status LIKE '%active%'
      GROUP BY u.name
      ORDER BY total DESC
    `
    const result = estimateQueryCost(sql)
    
    expect(result.cost).toBe('high')
    expect(result.factors.length).toBeGreaterThan(3)
  })
})

describe('Query Optimization', () => {
  test('should add optimization hints', async () => {
    const sql = 'SELECT * FROM users WHERE department = "Sales" ORDER BY created_at'
    
    const tableIndexes = new Map([
      ['users', ['department', 'created_at']]
    ])
    
    const result = await optimizeQuery(sql, { tableIndexes })
    
    expect(result.hints).toContain('Index available on users.department')
    expect(result.hints).toContain('Index available for ORDER BY on created_at')
  })

  test('should combine pagination with optimization', async () => {
    const sql = 'SELECT * FROM users'
    
    const result = await optimizeQuery(sql, {
      pagination: { page: 2, pageSize: 100 }
    })
    
    expect(result.sql).toContain('LIMIT 100')
    expect(result.sql).toContain('OFFSET 100')
    expect(result.hints.length).toBeGreaterThan(0)
  })
})

// ============================================
// INTEGRATION TESTS
// ============================================

describe('Pipeline Integration', () => {
  test('full pipeline flow for safe query', async () => {
    const query = 'SELECT name, email FROM users WHERE department = "Engineering"'
    
    // 1. Check cache (should miss)
    let cached = queryCache.get(query)
    expect(cached).toBeNull()
    
    // 2. Security validation
    const securityCheck = validateQuerySecurity(query)
    expect(securityCheck.safe).toBe(true)
    
    // 3. Optimization
    const optimized = await optimizeQuery(query, {
      pagination: { page: 1, pageSize: 50 }
    })
    expect(optimized.sql).toContain('LIMIT')
    
    // 4. Mock execution and cache result
    const mockResults = [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' }
    ]
    queryCache.set(query, mockResults)
    
    // 5. Cache hit on second request
    cached = queryCache.get(query)
    expect(cached).not.toBeNull()
    expect(cached?.data).toEqual(mockResults)
  })

  test('pipeline should reject malicious query', () => {
    const malicious = "SELECT * FROM users; DROP TABLE employees; --"
    
    // Security check should fail
    const securityCheck = validateQuerySecurity(malicious)
    expect(securityCheck.safe).toBe(false)
    expect(securityCheck.errors.length).toBeGreaterThan(0)
  })

  test('pipeline should optimize complex query', async () => {
    const complex = `
      SELECT u.name, d.name as department, COUNT(p.id) as project_count
      FROM users u
      JOIN departments d ON u.dept_id = d.id
      LEFT JOIN projects p ON u.id = p.user_id
      WHERE u.active = true
      GROUP BY u.name, d.name
      ORDER BY project_count DESC
    `
    
    // Security check
    const securityCheck = validateQuerySecurity(complex)
    expect(securityCheck.safe).toBe(true)
    
    // Cost estimation
    const cost = estimateQueryCost(complex)
    expect(cost.cost).toBe('high')
    
    // Optimization
    const optimized = await optimizeQuery(complex, {
      pagination: { page: 1, pageSize: 20 }
    })
    expect(optimized.hints.length).toBeGreaterThan(0)
  })
})

// ============================================
// PERFORMANCE BENCHMARKS
// ============================================

describe('Performance Benchmarks', () => {
  test('cache retrieval should be fast', () => {
    const query = 'SELECT * FROM users'
    const data = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `User${i}` }))
    
    queryCache.set(query, data)
    
    const start = performance.now()
    queryCache.get(query)
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(5) // Should be < 5ms
  })

  test('security validation should be fast', () => {
    const query = 'SELECT * FROM users WHERE department = "Sales" ORDER BY created_at LIMIT 50'
    
    const start = performance.now()
    validateQuerySecurity(query)
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(20) // Should be < 20ms
  })

  test('pagination should be fast', () => {
    const query = 'SELECT * FROM users WHERE active = true'
    
    const start = performance.now()
    paginateQuery(query, { page: 1, pageSize: 50 })
    const duration = performance.now() - start
    
    expect(duration).toBeLessThan(10) // Should be < 10ms
  })
})
