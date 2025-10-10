# Query Interface Split - Feature Separation

## Overview
Split the single Query Interface page into two distinct, specialized pages for better UX and feature clarity.

## New Pages Created

### 1. SQL Generator (`/query-generator`)
**Purpose:** Generate and preview SQL without execution

**Features:**
- Natural language to SQL conversion
- SQL preview with syntax highlighting
- Copy-to-clipboard functionality
- Parameter display
- Notes and warnings
- Table badge showing chosen table
- CTA to execute query on Query Executor page

**Use Cases:**
- Preview SQL before running
- Copy SQL for BI tools
- Share SQL in documentation
- Validate query logic
- CI/CD pipeline integration

**Key Differences:**
- No execution—preview only
- Emerald accent color scheme
- "Generate SQL" primary action
- Links to Query Executor for execution

---

### 2. Query Executor (`/query-executor`)
**Purpose:** Execute queries and view live results

**Features:**
- Natural language query execution
- Live result grid with sticky headers
- Row count badges
- Execution error handling
- SQL display (executed query)
- Parameters and notes
- Table badge
- Keyboard shortcut (Ctrl/Cmd + Enter)

**Use Cases:**
- Run ad-hoc queries
- Explore data interactively
- Validate employee analytics
- Generate reports
- Quick data inspection

**Key Differences:**
- Full execution with results table
- Sky-blue accent color scheme
- "Execute Query" primary action
- Result set with scrollable grid
- Execution error surface

---

## Navigation Flow

### Cross-linking
- Both pages have header badges with navigation links
- SQL Generator has a CTA card to execute on Query Executor (appears after generating SQL)
- Query Executor can accept `?prompt=` URL parameter for deep linking

### Home Page Integration
- Two separate sections on home page:
  - "SQL Generator" with 3 feature cards
  - "Query Executor" with 3 feature cards
- Each feature card links to its respective page
- Clear section headers with "Open" CTAs

---

## Technical Implementation

### Shared Backend
Both pages use the same `/api/nl-sql` endpoint:
- `execute: false` for SQL Generator (preview only)
- `execute: true` for Query Executor (run + results)

### Shared Components
- `Card`, `CardContent`, `CardGradient`
- `Badge`, `Button`
- Lucide icons
- Same UI primitives and styling system

### State Management
Both pages manage:
- Question input
- SQL output
- Parameters
- Notes
- Table name
- Loading states
- Error states

Query Executor additionally manages:
- Results (Row[])
- Execution errors
- Column extraction

---

## Benefits of Separation

1. **Clarity:** Users know exactly what each page does
2. **Performance:** Generator page is lighter (no result rendering)
3. **Safety:** Clear distinction between preview and execution
4. **Workflow:** Natural progression from generate → review → execute
5. **Portability:** Generator output can be used elsewhere
6. **Specialization:** Each page optimized for its use case

---

## Keyboard Shortcuts

- **SQL Generator:** Ctrl/Cmd + Enter → Generate SQL
- **Query Executor:** Ctrl/Cmd + Enter → Execute Query

---

## URL Parameters

Both pages support `?prompt=` for deep linking:
```
/query-generator?prompt=Show%20average%20salary%20by%20department
/query-executor?prompt=List%20top%205%20employees
```

---

## Next Steps (Optional Enhancements)

1. **Export Results:** Add CSV/JSON download from Query Executor
2. **Query History:** Persist recent queries with localStorage
3. **SQL Formatting:** Add prettier/sql-formatter integration
4. **Favorites:** Save frequently-used prompts
5. **Schema Hints:** Show available tables/columns in generator
6. **Explain Plan:** PostgreSQL EXPLAIN output for optimization

---

## File Structure

```
app/
  query-generator/
    page.tsx          # Generate SQL (preview only)
  query-executor/
    page.tsx          # Execute queries (full results)
  query-interface/
    page.tsx          # Legacy (can be removed or redirected)
  page.tsx            # Home page with both feature sections
```

---

## Migration Notes

- Old `/query-interface` still exists and works
- Can optionally redirect `/query-interface` to `/query-generator` or `/query-executor`
- Home page now showcases both tools separately
- API remains unchanged—backward compatible

---

**Status:** ✅ Complete and functional
**Build:** ✅ TypeScript passes
**Dev Server:** ✅ Both pages compile and serve successfully
