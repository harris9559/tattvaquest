/**
 * Standalone API handler for semantic search
 * Can be used with Express.js if needed
 */

import { supabase } from '../database/supabase_client';

interface SearchRequest {
  query: string;
  limit?: number;
  threshold?: number;
}

interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  file_name: string;
  file_type: string;
  created_at: string;
}

/**
 * Generate mock embedding (replace with real implementation)
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const mockEmbedding = Array(384).fill(0).map(() => Math.random() - 0.5);
  const magnitude = Math.sqrt(mockEmbedding.reduce((sum, val) => sum + val * val, 0));
  return mockEmbedding.map(val => val / magnitude);
}

/**
 * Express.js handler for POST /api/search
 */
export async function handleSearchRequest(req: any, res: any) {
  try {
    const { query, limit = 5, threshold = 0.7 }: SearchRequest = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required and must be a string' });
    }

    if (query.trim().length === 0) {
      return res.status(400).json({ error: 'Query cannot be empty' });
    }

    console.log(`[Search Handler] Searching for: ${query.substring(0, 100)}...`);

    const queryEmbedding = await generateEmbedding(query);

    // Try vector search
    let results: SearchResult[] = [];
    
    try {
      const { data, error } = await supabase
        .rpc('search_documents', {
          query_embedding: queryEmbedding,
          similarity_threshold: threshold,
          match_count: limit
        });

      if (!error && data) {
        results = data;
      } else {
        // Fallback to keyword search
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('documents')
          .select('id, content, file_name, file_type, created_at')
          .ilike('content', `%${query}%`)
          .limit(limit);

        if (!fallbackError && fallbackData) {
          results = fallbackData.map(doc => ({
            ...doc,
            similarity: 0.8
          }));
        }
      }
    } catch (error) {
      console.error('[Search Handler] Database error:', error);
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

    res.json({
      results: formattedResults,
      total: formattedResults.length
    });

  } catch (error) {
    console.error('[Search Handler] Error:', error);
    res.status(500).json({ error: 'Internal server error during search' });
  }
}

/**
 * Express.js handler for GET /api/search
 */
export async function handleListRecent(req: any, res: any) {
  try {
    const limit = parseInt(req.query.limit || '10');

    const { data, error } = await supabase
      .from('documents')
      .select('id, content, file_name, file_type, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const results = (data || []).map(doc => ({
      id: doc.id,
      content: doc.content.substring(0, 300) + (doc.content.length > 300 ? '...' : ''),
      similarity: 1.0,
      file_name: doc.file_name || 'Unknown Document',
      file_type: doc.file_type || 'unknown',
      created_at: doc.created_at
    }));

    res.json({
      results,
      total: results.length
    });

  } catch (error) {
    console.error('[Search Handler] List error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}
