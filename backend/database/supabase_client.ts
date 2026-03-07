/**
 * Supabase client configuration with pgvector support and production-grade retrieval pipeline
 * Handles database connections for document storage, chunking, embeddings, and chat history
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables - ensure these are set in your deployment
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Create Supabase client with additional options for production
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  db: {
    schema: 'public'
  }
});

// Enhanced SQL to create tables with document chunking support
export const createTablesSQL = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table (metadata only - no content or embeddings)
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  source TEXT,
  category TEXT,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks table with embeddings and full-text search
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(384), -- HuggingFace BAAI/bge-small-en-v1.5 dimension
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add full-text search support
ALTER TABLE document_chunks ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS document_chunks_search_vector_idx 
ON document_chunks USING GIN(search_vector);

-- Create vector index for similarity search
CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx 
ON document_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create indexes for metadata filtering
CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category);
CREATE INDEX IF NOT EXISTS documents_source_idx ON documents(source);
CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks(document_id);

-- Chat messages table for conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_used UUID[] DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Investigation logs for eDiscovery audit trail
CREATE TABLE IF NOT EXISTS investigation_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  response_preview TEXT,
  evidence_chunks_used UUID[] DEFAULT '{}',
  user_id TEXT,
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update search_vector trigger
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search_vector
CREATE TRIGGER document_chunks_search_vector_update
  BEFORE INSERT OR UPDATE ON document_chunks
  FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Hybrid search function combining vector and keyword search
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(384),
  query_text TEXT,
  similarity_threshold FLOAT DEFAULT 0.7,
  match_count INTEGER DEFAULT 5,
  category_filter TEXT DEFAULT NULL,
  source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  title TEXT,
  source TEXT,
  category TEXT,
  file_name TEXT,
  file_type TEXT,
  similarity FLOAT,
  keyword_rank FLOAT,
  combined_score FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH vector_search AS (
    SELECT 
      dc.id,
      dc.content,
      d.title,
      d.source,
      d.category,
      d.file_name,
      d.file_type,
      1 - (dc.embedding <=> query_embedding) as similarity,
      0 as keyword_rank,
      d.created_at
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE 1 - (dc.embedding <=> query_embedding) > similarity_threshold
    AND (category_filter IS NULL OR d.category = category_filter)
    AND (source_filter IS NULL OR d.source = source_filter)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_search AS (
    SELECT 
      dc.id,
      dc.content,
      d.title,
      d.source,
      d.category,
      d.file_name,
      d.file_type,
      0 as similarity,
      ts_rank(dc.search_vector, plainto_tsquery('english', query_text)) as keyword_rank,
      d.created_at
    FROM document_chunks dc
    JOIN documents d ON dc.document_id = d.id
    WHERE dc.search_vector @@ plainto_tsquery('english', query_text)
    AND (category_filter IS NULL OR d.category = category_filter)
    AND (source_filter IS NULL OR d.source = source_filter)
    ORDER BY keyword_rank DESC
    LIMIT match_count * 2
  )
  SELECT 
    COALESCE(vs.id, ks.id) as id,
    COALESCE(vs.content, ks.content) as content,
    COALESCE(vs.title, ks.title) as title,
    COALESCE(vs.source, ks.source) as source,
    COALESCE(vs.category, ks.category) as category,
    COALESCE(vs.file_name, ks.file_name) as file_name,
    COALESCE(vs.file_type, ks.file_type) as file_type,
    COALESCE(vs.similarity, 0) as similarity,
    COALESCE(ks.keyword_rank, 0) as keyword_rank,
    (COALESCE(vs.similarity, 0) * 0.7 + COALESCE(ks.keyword_rank, 0) * 0.3) as combined_score,
    COALESCE(vs.created_at, ks.created_at) as created_at
  FROM vector_search vs
  FULL OUTER JOIN keyword_search ks ON vs.id = ks.id
  WHERE COALESCE(vs.similarity, 0) > 0 OR COALESCE(ks.keyword_rank, 0) > 0
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Keyword search function
CREATE OR REPLACE FUNCTION keyword_search(
  query_text TEXT,
  match_count INTEGER DEFAULT 5,
  category_filter TEXT DEFAULT NULL,
  source_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  title TEXT,
  source TEXT,
  category TEXT,
  file_name TEXT,
  file_type TEXT,
  similarity FLOAT,
  keyword_rank FLOAT,
  combined_score FLOAT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dc.id,
    dc.content,
    d.title,
    d.source,
    d.category,
    d.file_name,
    d.file_type,
    0 as similarity,
    ts_rank(dc.search_vector, plainto_tsquery('english', query_text)) as keyword_rank,
    ts_rank(dc.search_vector, plainto_tsquery('english', query_text)) as combined_score,
    d.created_at
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE dc.search_vector @@ plainto_tsquery('english', query_text)
  AND (category_filter IS NULL OR d.category = category_filter)
  AND (source_filter IS NULL OR d.source = source_filter)
  ORDER BY keyword_rank DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
`;

// Initialize database with tables and functions
export const initializeDatabase = async (): Promise<void> => {
  try {
    console.log('[Database] Initializing database...');
    
    // Execute the SQL to create tables and functions
    const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (error) {
      console.log('[Database] RPC not available, using direct SQL execution...');
      // Fallback: Try to execute individual statements
      // In production, you would run this SQL directly in the database
      console.log('[Database] Please run the createTablesSQL manually in Supabase SQL editor');
    } else {
      console.log('[Database] Database initialized successfully');
    }
  } catch (error) {
    console.error('[Database] Error initializing database:', error);
  }
};
