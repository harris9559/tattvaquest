/**
 * Supabase client configuration with pgvector support
 * Handles database connections for document storage, embeddings, and chat history
 */

import { createClient } from '@supabase/supabase-js';

// Environment variables - ensure these are set in your deployment
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Database schema:
 * 
 * documents table:
 * - id: uuid (primary key)
 * - content: text (document content)
 * - embedding: vector (384 dimensions for all-MiniLM-L6-v2)
 * - file_name: text (original filename)
 * - file_type: text (pdf, txt, log)
 * - created_at: timestamp
 * 
 * entities table:
 * - id: uuid (primary key)
 * - document_id: uuid (foreign key to documents)
 * - entity: text (extracted entity)
 * - entity_type: text (PERSON, ORG, DATE, etc.)
 * - created_at: timestamp
 * 
 * chat_messages table:
 * - id: uuid (primary key)
 * - user_message: text
 * - ai_response: text
 * - context_used: json (document IDs used for context)
 * - created_at: timestamp
 */

// SQL to create tables with pgvector extension
export const createTablesSQL = `
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents table with vector embeddings and metadata
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(384), -- all-MiniLM-L6-v2 produces 384-dimensional vectors
  title TEXT,
  source TEXT,
  category TEXT,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add full-text search support
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS documents_search_vector_idx ON documents USING GIN(search_vector);

-- Update search_vector trigger
CREATE OR REPLACE FUNCTION documents_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.source, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search_vector
DROP TRIGGER IF EXISTS documents_search_vector_update_trigger ON documents;
CREATE TRIGGER documents_search_vector_update_trigger
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_vector_update();

-- Entities table for NLP extraction
CREATE TABLE IF NOT EXISTS entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- PERSON, ORG, DATE, MONEY, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table for conversation history
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_used JSONB, -- Store document IDs used for context
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vector index for similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create composite indexes for hybrid search
CREATE INDEX IF NOT EXISTS documents_category_idx ON documents(category);
CREATE INDEX IF NOT EXISTS documents_source_idx ON documents(source);
CREATE INDEX IF NOT EXISTS documents_created_at_idx ON documents(created_at DESC);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS entities_document_id_idx ON entities(document_id);
CREATE INDEX IF NOT EXISTS entities_entity_type_idx ON entities(entity_type);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);

-- Hybrid search function for combined vector and keyword search
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(384),
  query_text text,
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  category_filter text DEFAULT NULL,
  source_filter text DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  title TEXT,
  source TEXT,
  category TEXT,
  file_name TEXT,
  file_type TEXT,
  similarity float,
  keyword_rank float,
  combined_score float,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  vector_results RECORD;
  keyword_results RECORD;
  combined_results JSON := '[]'::JSON;
BEGIN
  -- Vector similarity search
  FOR vector_results IN
    SELECT 
      documents.id,
      documents.content,
      documents.title,
      documents.source,
      documents.category,
      documents.file_name,
      documents.file_type,
      1 - (documents.embedding <=> query_embedding) as similarity,
      0.0 as keyword_rank,
      1 - (documents.embedding <=> query_embedding) as combined_score,
      documents.created_at
    FROM documents
    WHERE 1 - (documents.embedding <=> query_embedding) > similarity_threshold
      AND (category_filter IS NULL OR documents.category = category_filter)
      AND (source_filter IS NULL OR documents.source = source_filter)
    ORDER BY similarity DESC
    LIMIT match_count * 2
  LOOP
    combined_results := combined_results || json_build_object(
      'id', vector_results.id,
      'content', vector_results.content,
      'title', vector_results.title,
      'source', vector_results.source,
      'category', vector_results.category,
      'file_name', vector_results.file_name,
      'file_type', vector_results.file_type,
      'similarity', vector_results.similarity,
      'keyword_rank', vector_results.keyword_rank,
      'combined_score', vector_results.combined_score,
      'created_at', vector_results.created_at
    );
  END LOOP;

  -- Full-text keyword search
  FOR keyword_results IN
    SELECT 
      documents.id,
      documents.content,
      documents.title,
      documents.source,
      documents.category,
      documents.file_name,
      documents.file_type,
      0.0 as similarity,
      ts_rank(documents.search_vector, plainto_tsquery('english', query_text)) as keyword_rank,
      ts_rank(documents.search_vector, plainto_tsquery('english', query_text)) as combined_score,
      documents.created_at
    FROM documents
    WHERE documents.search_vector @@ plainto_tsquery('english', query_text)
      AND (category_filter IS NULL OR documents.category = category_filter)
      AND (source_filter IS NULL OR documents.source = source_filter)
    ORDER BY keyword_rank DESC
    LIMIT match_count * 2
  LOOP
    -- Check if document already exists from vector search
    IF NOT EXISTS (
      SELECT 1 FROM json_array_elements(combined_results) doc 
      WHERE (doc->>'id')::UUID = keyword_results.id
    ) THEN
      combined_results := combined_results || json_build_object(
        'id', keyword_results.id,
        'content', keyword_results.content,
        'title', keyword_results.title,
        'source', keyword_results.source,
        'category', keyword_results.category,
        'file_name', keyword_results.file_name,
        'file_type', keyword_results.file_type,
        'similarity', keyword_results.similarity,
        'keyword_rank', keyword_results.keyword_rank,
        'combined_score', keyword_results.combined_score,
        'created_at', keyword_results.created_at
      );
    END IF;
  END LOOP;

  -- Return combined and ranked results
  RETURN QUERY
  SELECT 
    (doc->>'id')::UUID as id,
    doc->>'content' as content,
    doc->>'title' as title,
    doc->>'source' as source,
    doc->>'category' as category,
    doc->>'file_name' as file_name,
    doc->>'file_type' as file_type,
    (doc->>'similarity')::float as similarity,
    (doc->>'keyword_rank')::float as keyword_rank,
    (doc->>'combined_score')::float as combined_score,
    (doc->>'created_at')::TIMESTAMP WITH TIME ZONE as created_at
  FROM json_array_elements(combined_results) doc
  ORDER BY (doc->>'combined_score')::float DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Keyword search only function
CREATE OR REPLACE FUNCTION keyword_search(
  query_text text,
  match_count int DEFAULT 5,
  category_filter text DEFAULT NULL,
  source_filter text DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  title TEXT,
  source TEXT,
  category TEXT,
  file_name TEXT,
  file_type TEXT,
  keyword_rank float,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    documents.id,
    documents.content,
    documents.title,
    documents.source,
    documents.category,
    documents.file_name,
    documents.file_type,
    ts_rank(documents.search_vector, plainto_tsquery('english', query_text)) as keyword_rank,
    documents.created_at
  FROM documents
  WHERE documents.search_vector @@ plainto_tsquery('english', query_text)
    AND (category_filter IS NULL OR documents.category = category_filter)
    AND (source_filter IS NULL OR documents.source = source_filter)
  ORDER BY keyword_rank DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
`;

// Helper function to initialize database tables
export const initializeDatabase = async () => {
  try {
    const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    if (error) {
      console.error('Error initializing database:', error);
      // Fallback: try direct SQL execution if RPC not available
      console.log('Attempting direct table creation...');
    }
  } catch (error) {
    console.error('Database initialization failed:', error);
  }
};
