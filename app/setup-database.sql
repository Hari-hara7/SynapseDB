# SynapseDB Database Setup Script
# Run this in your PostgreSQL database to set up required tables and extensions

-- Install required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Document table for storing text chunks with embeddings
CREATE TABLE IF NOT EXISTS "Document" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(768),  -- Adjust dimension based on your embedding model
  metadata JSONB,
  "uploadedAt" TIMESTAMP DEFAULT NOW()
);

-- Query log table for tracking queries
CREATE TABLE IF NOT EXISTS "QueryLog" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  type TEXT NOT NULL,
  "responseTime" DOUBLE PRECISION NOT NULL,
  "cacheHit" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Create vector similarity search index
-- This improves query performance for large document collections
CREATE INDEX IF NOT EXISTS document_embedding_idx 
  ON "Document" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Optional: Create index on filename for faster lookups
CREATE INDEX IF NOT EXISTS document_filename_idx ON "Document" (filename);

-- Optional: Create index on uploadedAt for time-based queries
CREATE INDEX IF NOT EXISTS document_uploaded_idx ON "Document" ("uploadedAt");

-- Verify setup
SELECT 'Extensions installed:' as message;
SELECT extname, extversion FROM pg_extension WHERE extname IN ('vector', 'pgcrypto');

SELECT 'Tables created:' as message;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('Document', 'QueryLog');

SELECT 'Indexes created:' as message;
SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'Document';

SELECT 'Setup complete!' as message;
