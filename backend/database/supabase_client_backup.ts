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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS entities_document_id_idx ON entities(document_id);
CREATE INDEX IF NOT EXISTS entities_entity_type_idx ON entities(entity_type);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);
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
