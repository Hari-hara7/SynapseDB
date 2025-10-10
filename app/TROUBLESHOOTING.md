# Query Pipeline Troubleshooting Guide

## Quick Diagnostics

### 1. Run the Test Endpoint
Visit: `http://localhost:3003/api/pipeline-test`

This will check:
- ✅ Database connection
- ✅ Schema introspection
- ✅ Document table existence
- ✅ Gemini API key
- ✅ Cache system
- ✅ Security module
- ✅ Optimizer module

### 2. Common Errors & Solutions

#### Error: "Cannot connect to database"
**Cause**: Database connection string is invalid or database is not running

**Solution**:
1. Check `.env` file has `DATABASE_URL`
2. Verify PostgreSQL is running
3. Run: `npx prisma db push` to sync schema

```bash
# Check database connection
npx prisma db pull
```

---

#### Error: "Document table does not exist"
**Cause**: Database schema not initialized

**Solution**:
```bash
cd app
npx prisma migrate dev
# or
npx prisma db push
```

---

#### Error: "GEMINI_API_KEY is not configured"
**Cause**: Missing Gemini API key

**Solution**:
1. Get API key from: https://aistudio.google.com/app/apikey
2. Add to `.env`:
```env
GEMINI_API_KEY=your_api_key_here
```
3. Restart dev server

**Note**: Pipeline will still work but without AI features (uses fallbacks)

---

#### Error: "pg_indexes not found"
**Cause**: Index introspection query failed

**Solution**:
This is now handled gracefully. The pipeline will work without index hints.

---

#### Error: "Rate limit exceeded"
**Cause**: Too many requests from same user

**Solution**:
Wait 60 seconds or increase limit in `lib/query-security.ts`:
```typescript
const rateLimiter = new RateLimiter(
  200,   // Increase from 100
  60000
)
```

---

#### Error: "Query execution failed"
**Cause**: Generated SQL is invalid or table doesn't exist

**Solution**:
1. Check database has tables
2. Try simpler query first
3. Check console for SQL error details
4. Verify table names match schema

---

#### Error: "Classification failed"
**Cause**: Gemini API issue or network problem

**Solution**:
Pipeline auto-falls back to "structured" classification. Check:
1. Internet connection
2. Gemini API key validity
3. API quota limits

---

### 3. Step-by-Step Debugging

#### Check 1: Database Connection
```bash
# In terminal
cd app
npx prisma studio
```
If Prisma Studio opens, database is accessible.

#### Check 2: Tables Exist
Visit: `http://localhost:3003/db`
Should show your database tables.

#### Check 3: Pipeline Test
Visit: `http://localhost:3003/api/pipeline-test`
Check which tests pass/fail.

#### Check 4: Simple Query Test
```typescript
// In browser console at /query-pipeline
fetch('/api/query-pipeline', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'test',
    page: 1,
    pageSize: 10,
  })
}).then(r => r.json()).then(console.log)
```

---

### 4. Environment Setup Checklist

- [ ] PostgreSQL installed and running
- [ ] `.env` file exists with `DATABASE_URL`
- [ ] `GEMINI_API_KEY` in `.env` (optional but recommended)
- [ ] Ran `npm install`
- [ ] Ran `npx prisma generate`
- [ ] Ran `npx prisma db push` or `npx prisma migrate dev`
- [ ] Dev server running: `npm run dev`

---

### 5. Fresh Start (Nuclear Option)

If nothing works, reset everything:

```bash
# Stop dev server (Ctrl+C)

# Reset database
cd app
npx prisma migrate reset --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma client
npx prisma generate

# Push schema
npx prisma db push

# Start fresh
npm run dev
```

---

### 6. Check Console Logs

The pipeline logs important info to console:

```bash
# Look for these in terminal:
✓ Compiled /api/query-pipeline
POST /api/query-pipeline 200 in XXXms

# Or errors:
⨯ Error: GEMINI_API_KEY is not configured
⨯ PrismaClientKnownRequestError: Table 'Document' does not exist
```

---

### 7. Browser DevTools

Press `F12` in browser and check:

**Console Tab**:
- Look for fetch errors
- Check error messages

**Network Tab**:
- Find `/api/query-pipeline` request
- Check status code (200 = good, 500 = error)
- Click on request → Preview to see response

---

### 8. Common Warning Messages (Safe to Ignore)

These warnings are normal and handled:

```
⚠ Warning: Next.js inferred your workspace root
⚠ Port 3000 is in use, using port 3003
⚠ Optimization failed, using basic pagination
⚠ Document search failed: table "Document" does not exist
⚠ Failed to fetch table indexes
```

---

### 9. Performance Issues

#### Slow Response Times

**Check**:
1. Cache hit rate (should be >60%)
2. Query complexity (avoid 10+ JOINs)
3. Database indexes on WHERE/ORDER BY columns
4. Network latency to Gemini API

**Solutions**:
```typescript
// Increase cache size in lib/query-cache.ts
const queryCache = new QueryCache(
  5000,              // Increase from 1000
  10 * 60 * 1000     // 10 min TTL instead of 5
)

// Or disable cache for testing
{
  query: "...",
  enableCache: false
}
```

---

### 10. Getting Help

If you're still stuck:

1. **Check test endpoint**: `/api/pipeline-test`
2. **Copy error message** from browser console
3. **Check which test fails** in test endpoint
4. **Verify environment** (Node version, npm version)
5. **Try simple query** first: "test" or "SELECT 1"

---

## Quick Fix Commands

```bash
# Reset everything
npx prisma migrate reset --force && npm run dev

# Just restart
# Ctrl+C to stop, then:
npm run dev

# Check database
npx prisma studio

# Regenerate Prisma
npx prisma generate

# Check env vars
# Windows PowerShell:
Get-Content .env

# Linux/Mac:
cat .env
```

---

## Working Example

Once everything is set up, this should work:

1. Visit: `http://localhost:3003/query-pipeline`
2. Enter: "test query"
3. Click: "Execute"
4. See: Results with performance metrics

Even without proper database setup, you should see a response (might have empty results but no errors).

---

## Still Not Working?

The pipeline is now resilient and should handle most errors gracefully:

- ❌ No database? → Returns error message (not crash)
- ❌ No Gemini key? → Uses fallback classification
- ❌ No tables? → Returns empty results
- ❌ Bad SQL? → Shows error details
- ❌ No indexes? → Works without optimization hints

If you see a **complete crash** or **white screen**, check:
1. Browser console for React errors
2. Terminal for compilation errors
3. `/api/pipeline-test` endpoint for diagnostic info
