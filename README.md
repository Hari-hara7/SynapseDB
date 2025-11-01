# SynapseDB

A hybrid database query system that combines structured SQL databases with document vector search using AI embeddings.

## Features

- **Hybrid Query System**: Query both structured databases and document collections using natural language
- **Document Upload & Processing**: Upload PDFs and text files, automatically chunked and embedded
- **Vector Search**: Semantic search through documents using embeddings
- **SQL Generation**: AI-powered SQL query generation from natural language
- **Database Schema Inspector**: Connect to and inspect PostgreSQL database schemas

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Node.js runtime)
- **Database**: PostgreSQL with pgvector extension
- **AI/ML**: Google Gemini API for embeddings and LLM queries
- **ORM**: Prisma

## Prerequisites

1. **Node.js** 18+ and npm
2. **PostgreSQL** 14+ with the following extensions:
   - `pgvector` - for vector similarity search
   - `pgcrypto` - for UUID generation
3. **Google Gemini API Key** - Get from [Google AI Studio](https://ai.google.dev/)

## Quick Start

### 1. Install Dependencies

```powershell
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and add your credentials:

```powershell
Copy-Item .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/synapse?schema=public"
GEMINI_API_KEY="your_gemini_api_key_here"
```

### 3. Setup Database

Run these SQL commands in your PostgreSQL database:

```sql
-- Install extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create tables
CREATE TABLE "Document" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),
  metadata JSONB,
  "uploadedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "QueryLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  type TEXT NOT NULL,
  "responseTime" DOUBLE PRECISION NOT NULL,
  "cacheHit" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create vector index
CREATE INDEX ON "Document" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 4. Run Development Server

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or check terminal for actual port).

## Usage Guide

### Upload Documents (`/upload`)
- Upload PDF or text files
- Automatic text extraction, chunking, and embedding
- Supported: `.txt`, `.pdf`, `.md`

### Database Inspector (`/db`)
- Inspect PostgreSQL database schemas
- View tables and columns

### Natural Language Query (`/query`)
- Ask questions in plain English
- AI generates and executes SQL

### Hybrid Query (`/hybrid`)
- Search both database and documents
- Three modes: Hybrid, Structured, Documents

## Troubleshooting

### PDF Upload Issues
- Ensure PDF contains extractable text (not scanned images)
- Try uploading `.txt` files first to verify setup

### Database Connection
```powershell
# Test PostgreSQL connection
psql -U postgres -c "SELECT 1"

# Verify pgvector extension
psql -U postgres -d yourdb -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### Environment Variables
- Ensure `.env` exists in `/app` directory
- Restart dev server after changing `.env`
- Verify API key is valid at [Google AI Studio](https://ai.google.dev/)

## Project Structure

```
app/
├── app/              # Next.js app directory
│   ├── api/         # API routes (db, hybrid, query, upload)
│   ├── db/          # DB inspector page
│   ├── hybrid/      # Hybrid query page
│   ├── query/       # Query page
│   ├── upload/      # Upload page
│   └── page.tsx     # Home page
├── lib/             # Utilities (embeddings, chunking, SQL validation)
├── prisma/          # Database schema
└── types/           # TypeScript declarations
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Google Gemini API](https://ai.google.dev/)
