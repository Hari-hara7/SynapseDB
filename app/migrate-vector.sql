-- Migration to convert embedding column from text to vector type
-- This requires pgvector extension to be installed

-- First, ensure pgvector extension is enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop the existing embedding column if it's text type
ALTER TABLE "Document" DROP COLUMN IF EXISTS embedding;

-- Add embedding column with proper vector type (768 dimensions for Gemini text-embedding-004)
ALTER TABLE "Document" ADD COLUMN embedding vector(768);

-- Create an index for faster similarity searches
CREATE INDEX IF NOT EXISTS document_embedding_idx ON "Document" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Verify the change
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Document';
