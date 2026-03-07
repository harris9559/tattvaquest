# TattvaQuest RAG Infrastructure Setup

This document explains how to set up and deploy the Retrieval Augmented Generation (RAG) infrastructure for TattvaQuest's AI-powered legal and forensic consulting platform.

## Architecture Overview

```
Frontend (Next.js on Vercel)
    ↓
API Routes (Next.js API / Express on Render)
    ↓
RAG Pipeline
    ↓
Supabase (PostgreSQL + pgvector)
```

## Components

### 1. Database (Supabase)
- **PostgreSQL** with **pgvector** extension for vector similarity search
- Tables: `documents`, `entities`, `chat_messages`
- Vector embeddings: 384 dimensions (all-MiniLM-L6-v2)

### 2. AI Services
- **Groq LLaMA3** for AI generation
- **sentence-transformers** for embeddings
- **spaCy** for NLP entity extraction

### 3. API Endpoints
- `/api/chat` - RAG-powered chatbot
- `/api/upload` - Document ingestion
- `/api/search` - Semantic search
- `/api/analyze-log` - Forensic log analysis

## Environment Variables

### Required for All Environments
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Groq AI Configuration
GROQ_API_KEY=gsk_your-groq-api-key

# API Configuration (for Express backend)
PORT=3001
NODE_ENV=production
```

### Frontend (Next.js)
```bash
# API URL pointing to backend
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
```

## Database Setup

### 1. Enable pgvector Extension
```sql
-- Run in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Create Tables
```sql
-- Documents table with vector embeddings
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  embedding vector(384),
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Entities table for NLP extraction
CREATE TABLE IF NOT EXISTS entities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  context_used JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vector index for similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Performance indexes
CREATE INDEX IF NOT EXISTS entities_document_id_idx ON entities(document_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages(created_at DESC);
```

### 3. Create Search Function (Optional)
```sql
-- For advanced vector search
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding vector(384),
  similarity_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  similarity float,
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity,
    documents.file_name,
    documents.file_type,
    documents.created_at
  FROM documents
  WHERE 1 - (documents.embedding <=> query_embedding) > similarity_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
```

## Python Services Setup

### 1. Install Python Dependencies
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install sentence-transformers spacy python-multipart fastapi uvicorn
python -m spacy download en_core_web_sm
```

### 2. Run Python Services
```bash
# Start embedding service
python backend/ai/embeddings.py

# Start NLP service
python backend/nlp/spacy_pipeline.py
```

## Deployment Options

### Option 1: Next.js API Routes (Recommended for Vercel)
- Use files in `app/api/` directory
- Deploy to Vercel with frontend
- Environment variables configured in Vercel dashboard

### Option 2: Express.js Backend (Render)
- Use files in `backend/api/` directory
- Deploy to Render as separate service
- Configure environment variables in Render dashboard

### Option 3: Hybrid Approach
- Frontend on Vercel
- Python microservices on separate containers
- Supabase for database

## Integration with Existing Frontend

### Update LeadChatWidget.tsx
The existing `LeadChatWidget.tsx` should call the new `/api/chat` endpoint:

```typescript
// In handleAiChat function
const response = await fetch(`${apiBaseUrl}/api/chat`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: userMessage }),
});
```

### Add Document Upload Component
Create a component to upload documents:

```typescript
// Example upload component
async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });
  
  return response.json();
}
```

## Testing the System

### 1. Test Chat API
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is digital forensics?"}'
```

### 2. Test Document Upload
```bash
curl -X POST http://localhost:3000/api/upload \
  -F "file=@document.pdf"
```

### 3. Test Search
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"legal compliance","limit":5}'
```

### 4. Test Log Analysis
```bash
curl -X POST http://localhost:3000/api/analyze-log \
  -H "Content-Type: application/json" \
  -d '{"log_content":"Failed password for root from 192.168.1.100"}'
```

## Production Considerations

### Security
- Use Supabase Row Level Security (RLS)
- Implement API rate limiting
- Validate all file uploads
- Sanitize user inputs

### Performance
- Implement caching for frequently accessed documents
- Use CDN for static assets
- Monitor database query performance
- Set up proper indexing

### Monitoring
- Log all API requests and responses
- Monitor Groq API usage and costs
- Track database performance metrics
- Set up alerts for errors

## Troubleshooting

### Common Issues

1. **Vector search not working**
   - Ensure pgvector extension is enabled
   - Check embedding dimensions (should be 384)
   - Verify vector index creation

2. **Groq API errors**
   - Check API key validity
   - Monitor rate limits
   - Verify request format

3. **File upload failures**
   - Check file size limits
   - Verify MIME type handling
   - Ensure proper permissions

4. **Database connection issues**
   - Verify Supabase credentials
   - Check network connectivity
   - Review RLS policies

## Next Steps

1. Set up Supabase project and configure database
2. Deploy backend services (Next.js API or Express)
3. Configure environment variables
4. Test all endpoints
5. Integrate with existing frontend components
6. Set up monitoring and logging
7. Deploy to production

---

This RAG infrastructure provides a solid foundation for AI-powered legal and forensic consulting capabilities. The modular design allows for easy scaling and customization based on specific requirements.
