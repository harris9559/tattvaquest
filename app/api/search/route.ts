/**
 * Next.js API Route for Semantic Search
 * Provides document search using vector similarity
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/backend/database/supabase_client';

/**
 * Generate embedding for query text
 * Note: In production, this would call a Python embedding service
 */
async function generateEmbedding(text: string): Promise<number[]> {
  // TODO: Replace with actual embedding generation
  // Mock embedding for demonstration (384 dimensions)
  const mockEmbedding = Array(384).fill(0).map(() => Math.random() - 0.5);
  
  // Normalize the embedding
  const magnitude = Math.sqrt(mockEmbedding.reduce((sum, val) => sum + val * val, 0));
  return mockEmbedding.map(val => val / magnitude);
}

/**
 * Shared search logic - can be called from POST, GET, or internally
 */
async function performSearch(query: string, limit: number = 5, threshold: number = 0.7) {
  console.log(`[Search API] Searching for: ${query.substring(0, 100)}...`);

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Perform vector search using Supabase pgvector
  let results: any[] = [];
  
  try {
    // Try using RPC function first (if exists)
    const { data, error } = await supabase
      .rpc('search_documents', {
        query_embedding: queryEmbedding,
        similarity_threshold: threshold,
        match_count: limit
      });

    if (error) {
      console.log('[Search API] RPC not available, using direct query');
      
      // Fallback to direct SQL query
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('documents')
        .select('id, content, file_name, file_type, created_at')
        .order('created_at', { ascending: false })
        .limit(limit * 2); // Get more to filter manually

      if (fallbackError) {
        throw fallbackError;
      }

      // Simple keyword-based fallback (not semantic, but functional)
      results = fallbackData
        .filter((doc: any) => 
          doc.content.toLowerCase().includes(query.toLowerCase()) ||
          doc.file_name.toLowerCase().includes(query.toLowerCase())
        )
        .slice(0, limit)
        .map((doc: any) => ({
          ...doc,
          similarity: 0.8 // Mock similarity for keyword match
        }));

    } else {
      results = data || [];
    }

  } catch (error) {
    console.error('[Search API] Database search error:', error);
    
    // Final fallback: simple text search
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('documents')
      .select('id, content, file_name, file_type, created_at')
      .textSearch('content', query)
      .limit(limit);

    if (!fallbackError && fallbackData) {
      results = fallbackData.map((doc: any) => ({
        ...doc,
        similarity: 0.7 // Mock similarity for text search
      }));
    }
  }

  // Format results
  const formattedResults = results.map(result => ({
    id: result.id,
    content: result.content.substring(0, 300) + (result.content.length > 300 ? '...' : ''),
    similarity: result.similarity || 0.5,
    file_name: result.file_name || 'Unknown Document',
    file_type: result.file_type || 'unknown',
    created_at: result.created_at
  }));

  console.log(`[Search API] Found ${formattedResults.length} results`);

  return {
    results: formattedResults,
    total: formattedResults.length
  };
}

/**
 * POST /api/search
 * 
 * Request body:
 * {
 *   "query": "search query text",
 *   "limit": 5, // optional, default 5
 *   "threshold": 0.7 // optional, default 0.7
 * }
 * 
 * Response:
 * {
 *   "results": [
 *     {
 *       "id": "document_id",
 *       "content": "document content snippet",
 *       "similarity": 0.85,
 *       "file_name": "source_document.pdf",
 *       "file_type": "pdf",
 *       "created_at": "2024-03-07T18:00:00Z"
 *     }
 *   ],
 *   "total": 3
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { query, limit = 5, threshold = 0.7 } = body;

    // Validate input
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query cannot be empty' },
        { status: 400 }
      );
    }

    if (query.length > 500) {
      return NextResponse.json(
        { error: 'Query is too long (max 500 characters)' },
        { status: 400 }
      );
    }

    const searchResult = await performSearch(query, limit, threshold);
    return NextResponse.json(searchResult);

  } catch (error) {
    console.error('[Search API] Error processing search:', error);
    
    return NextResponse.json(
      { error: 'Internal server error during search' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search
 * 
 * Get recent documents or search by query parameter
 * 
 * Query parameters:
 * - q: search query (optional)
 * - limit: number of results (optional, default 10)
 * 
 * Response:
 * {
 *   "results": [...],
 *   "total": 3
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (query) {
      // Use shared search logic instead of calling POST
      const searchResult = await performSearch(query, limit);
      return NextResponse.json(searchResult);
    } else {
      // If no query, return recent documents
      const { data, error } = await supabase
        .from('documents')
        .select('id, content, file_name, file_type, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('[Search API] Error fetching recent documents:', error);
        return NextResponse.json(
          { error: 'Failed to fetch documents' },
          { status: 500 }
        );
      }

      const results = (data || []).map((doc: any) => ({
        id: doc.id,
        content: doc.content.substring(0, 300) + (doc.content.length > 300 ? '...' : ''),
        similarity: 1.0, // Perfect match for recent docs
        file_name: doc.file_name || 'Unknown Document',
        file_type: doc.file_type || 'unknown',
        created_at: doc.created_at
      }));

      return NextResponse.json({
        results,
        total: results.length
      });
    }

  } catch (error) {
    console.error('[Search API] Error in GET request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
