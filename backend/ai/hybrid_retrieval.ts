/**
 * Hybrid Retrieval System for TattvaQuest RAG
 * Combines vector similarity search, keyword search, and metadata filtering
 * Implements enterprise-grade retrieval with fallback to general LLM knowledge
 */

import { supabase } from '../database/supabase_client';

interface DocumentResult {
  id: string;
  content: string;
  title?: string;
  source?: string;
  category?: string;
  file_name?: string;
  file_type?: string;
  similarity: number;
  keyword_rank: number;
  combined_score: number;
  created_at: string;
  embedding?: number[]; // Optional: only present when fetched from DB
}

interface HybridSearchOptions {
  query: string;
  embedding: number[];
  limit?: number;
  similarityThreshold?: number;
  categoryFilter?: string;
  sourceFilter?: string;
}

/**
 * Hybrid Retrieval System
 * Implements multi-modal search with intelligent ranking
 */
export class HybridRetrieval {
  /**
   * Perform hybrid search combining vector similarity and keyword search
   * ALWAYS returns chunks if any exist in the database
   */
  async hybridSearch(options: HybridSearchOptions): Promise<DocumentResult[]> {
    const {
      query,
      embedding,
      limit = 5,
      categoryFilter,
      sourceFilter
    } = options;

    console.log('[Hybrid Retrieval] Starting hybrid search...');
    console.log('[Hybrid Retrieval] Query:', query);
    console.log('[Hybrid Retrieval] Embedding dimension:', embedding.length);

    try {
      // Step 1: Get ALL chunks from database first
      console.log('[Hybrid Retrieval] Step 1: Fetching all chunks...');
      const allChunks = await this.getAllChunks(categoryFilter, sourceFilter);
      console.log('[Hybrid Retrieval] Total chunks in DB:', allChunks.length);

      if (allChunks.length === 0) {
        console.warn('[Hybrid Retrieval] No chunks found in database');
        return [];
      }

      // Step 2: Calculate similarity for all chunks with embeddings
      console.log('[Hybrid Retrieval] Step 2: Calculating similarities...');
      const chunksWithSimilarity = allChunks.map(chunk => {
        let similarity = 0;
        
        if (chunk.embedding && Array.isArray(chunk.embedding) && chunk.embedding.length > 0) {
          try {
            similarity = this.calculateCosineSimilarity(embedding, chunk.embedding);
          } catch (err) {
            console.warn(`[Hybrid Retrieval] Similarity calc failed for chunk ${chunk.id}`);
            similarity = 0;
          }
        }
        
        return {
          ...chunk,
          similarity,
          keyword_rank: 0,
          combined_score: similarity
        };
      });

      // Step 3: Sort by similarity and get top results
      const sortedChunks = chunksWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      console.log('[Hybrid Retrieval] Top similarity scores:', 
        sortedChunks.slice(0, 3).map(c => c.similarity.toFixed(3)));

      // Step 4: If we have results with embeddings, return them
      if (sortedChunks.length > 0 && sortedChunks[0].similarity > 0) {
        console.log('[Hybrid Retrieval] Returning', sortedChunks.length, 'vector-ranked chunks');
        return sortedChunks;
      }

      // Step 5: Fallback to keyword search if no good vector matches
      console.log('[Hybrid Retrieval] Step 3: Attempting keyword search...');
      const keywordResults = await this.keywordSearch(query, limit, categoryFilter, sourceFilter);
      
      if (keywordResults.length > 0) {
        console.log('[Hybrid Retrieval] Returning', keywordResults.length, 'keyword-matched chunks');
        return keywordResults;
      }

      // Step 6: Last resort - return most recent chunks regardless of similarity
      console.log('[Hybrid Retrieval] Step 4: Returning most recent chunks...');
      const recentChunks = allChunks
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit)
        .map(chunk => ({
          ...chunk,
          similarity: 0.5, // Default score
          keyword_rank: 0,
          combined_score: 0.5
        }));

      console.log('[Hybrid Retrieval] Returning', recentChunks.length, 'recent chunks');
      return recentChunks;

    } catch (error) {
      console.error('[Hybrid Retrieval] Search error:', error);
      // Emergency fallback: get any chunks we can
      return this.getRecentDocuments(limit);
    }
  }

  /**
   * Get all chunks from the database
   */
  private async getAllChunks(
    categoryFilter?: string,
    sourceFilter?: string
  ): Promise<DocumentResult[]> {
    try {
      let query = supabase
        .from('document_chunks')
        .select(`
          id,
          content,
          embedding,
          documents!inner(
            id,
            title,
            source,
            category,
            file_name,
            file_type
          )
        `);

      // Only apply filters if explicitly provided and meaningful
      if (categoryFilter && categoryFilter.trim() !== '' && categoryFilter !== 'Uncategorized') {
        query = query.eq('documents.category', categoryFilter);
      }
      
      if (sourceFilter && sourceFilter.trim() !== '' && sourceFilter !== 'User Upload') {
        query = query.eq('documents.source', sourceFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Hybrid Retrieval] Error fetching chunks:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((chunk: any) => ({
        id: chunk.id,
        content: chunk.content,
        title: chunk.documents?.title || 'Untitled',
        source: chunk.documents?.source || 'Unknown',
        category: chunk.documents?.category || 'Uncategorized',
        file_name: chunk.documents?.file_name || 'unknown',
        file_type: chunk.documents?.file_type || 'text/plain',
        embedding: chunk.embedding,
        similarity: 0,
        keyword_rank: 0,
        combined_score: 0,
        created_at: new Date().toISOString()
      }));

    } catch (error) {
      console.error('[Hybrid Retrieval] Error in getAllChunks:', error);
      return [];
    }
  }

  /**
   * Vector similarity search using pgvector with proper cosine similarity
   */
  private async vectorSearch(
    embedding: number[],
    limit: number,
    threshold: number,
    categoryFilter?: string,
    sourceFilter?: string
  ): Promise<DocumentResult[]> {
    try {
      console.log('[Hybrid Retrieval] Performing vector search with pgvector...');
      
      // Use the document_chunks table with proper vector similarity
      let query = supabase
        .from('document_chunks')
        .select(`
          id,
          content,
          embedding,
          documents!inner(
            id,
            title,
            source,
            category,
            file_name,
            file_type
          )
        `)
        .not('embedding', 'is', null);

      // Only apply metadata filters if explicitly provided and not empty
      if (categoryFilter && categoryFilter.trim() !== '' && categoryFilter !== 'Uncategorized') {
        console.log('[Hybrid Retrieval] Applying category filter:', categoryFilter);
        query = query.eq('documents.category', categoryFilter);
      }
      
      if (sourceFilter && sourceFilter.trim() !== '' && sourceFilter !== 'User Upload') {
        console.log('[Hybrid Retrieval] Applying source filter:', sourceFilter);
        query = query.eq('documents.source', sourceFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[Hybrid Retrieval] Vector search error:', error);
        return [];
      }

      console.log('[Hybrid Retrieval] Retrieved chunks for vector calculation:', data?.length || 0);

      if (!data || data.length === 0) {
        console.warn('[Hybrid Retrieval] No chunks with embeddings found');
        return [];
      }

      // Calculate cosine similarity for each chunk
      const resultsWithSimilarity = (data || []).map((chunk: any) => {
        const chunkEmbedding = chunk.embedding as number[];
        const similarity = this.calculateCosineSimilarity(embedding, chunkEmbedding);
        
        return {
          id: chunk.id,
          content: chunk.content,
          title: chunk.documents?.title || 'Untitled',
          source: chunk.documents?.source || 'Unknown',
          category: chunk.documents?.category || 'Uncategorized',
          file_name: chunk.documents?.file_name || 'unknown',
          file_type: chunk.documents?.file_type || 'text/plain',
          similarity: similarity,
          keyword_rank: 0,
          combined_score: similarity,
          created_at: new Date().toISOString()
        };
      });

      // Sort by similarity (highest first) and filter by threshold
      let filteredResults = resultsWithSimilarity
        .sort((a: any, b: any) => b.similarity - a.similarity);

      // Only apply threshold if it's > 0
      if (threshold > 0) {
        filteredResults = filteredResults.filter((doc: any) => doc.similarity > threshold);
      }

      console.log(`[Hybrid Retrieval] Top similarity scores:`, 
        filteredResults.slice(0, 3).map((r: any) => r.similarity.toFixed(3)));

      return filteredResults.slice(0, limit);

    } catch (error) {
      console.error('[Hybrid Retrieval] Vector search failed:', error);
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      console.warn('[Hybrid Retrieval] Vector length mismatch');
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Full-text keyword search using PostgreSQL tsvector
   */
  private async keywordSearch(
    query: string,
    limit: number,
    categoryFilter?: string,
    sourceFilter?: string
  ): Promise<DocumentResult[]> {
    try {
      console.log('[Hybrid Retrieval] Performing keyword search...');
      
      // Try keyword search function first
      const { data: keywordResults, error: keywordError } = await supabase
        .rpc('keyword_search', {
          query_text: query,
          match_count: limit,
          category_filter: categoryFilter || null,
          source_filter: sourceFilter || null
        });

      if (!keywordError && keywordResults) {
        console.log('[Hybrid Retrieval] Keyword search function results:', keywordResults.length);
        return keywordResults.map(this.normalizeDocumentResult);
      }

      // Fallback: Use document_chunks with ILIKE search
      console.log('[Hybrid Retrieval] Using fallback ILIKE search on chunks');
      const { data, error } = await supabase
        .from('document_chunks')
        .select(`
          id,
          content,
          documents!inner(
            id,
            title,
            source,
            category,
            file_name,
            file_type
          )
        `)
        .ilike('content', `%${query}%`)
        .limit(limit);

      if (error) {
        console.error('[Hybrid Retrieval] Keyword search error:', error);
        return [];
      }

      console.log('[Hybrid Retrieval] Keyword search results:', data?.length || 0);

      return (data || []).map((chunk: any) => ({
        id: chunk.id,
        content: chunk.content,
        title: chunk.documents?.title || 'Untitled',
        source: chunk.documents?.source || 'Unknown',
        category: chunk.documents?.category || 'Uncategorized',
        file_name: chunk.documents?.file_name || 'unknown',
        file_type: chunk.documents?.file_type || 'text/plain',
        similarity: 0,
        keyword_rank: 0.9, // High rank for keyword matches
        combined_score: 0.9,
        created_at: new Date().toISOString()
      }));

    } catch (error) {
      console.error('[Hybrid Retrieval] Keyword search failed:', error);
      return [];
    }
  }

  /**
   * Combine and rank results from vector and keyword search
   */
  private combineAndRankResults(
    vectorResults: DocumentResult[],
    keywordResults: DocumentResult[],
    limit: number
  ): DocumentResult[] {
    // Create a map to deduplicate by document ID
    const combinedMap = new Map<string, DocumentResult>();

    // Add vector results with higher priority
    vectorResults.forEach((doc: any) => {
      const existing = combinedMap.get(doc.id);
      if (!existing || doc.similarity > existing.similarity) {
        combinedMap.set(doc.id, {
          ...doc,
          combined_score: doc.similarity * 0.7, // Weight vector similarity
          keyword_rank: existing?.keyword_rank || 0
        });
      }
    });

    // Add keyword results
    keywordResults.forEach((doc: DocumentResult) => {
      const existing = combinedMap.get(doc.id);
      if (!existing) {
        combinedMap.set(doc.id, {
          ...doc,
          combined_score: doc.keyword_rank * 0.3, // Weight keyword rank
          similarity: 0
        });
      } else {
        // Update existing with keyword info
        combinedMap.set(doc.id, {
          ...existing,
          keyword_rank: doc.keyword_rank,
          combined_score: existing.similarity * 0.7 + doc.keyword_rank * 0.3
        });
      }
    });

    // Convert to array and sort by combined score
    const combinedResults = Array.from(combinedMap.values())
      .sort((a: any, b: any) => b.combined_score - a.combined_score)
      .slice(0, limit);

    console.log('[Hybrid Retrieval] Ranked results:', combinedResults.map((r: any) => ({
      id: r.id,
      combined_score: r.combined_score,
      similarity: r.similarity,
      keyword_rank: r.keyword_rank
    })));

    return combinedResults;
  }

  /**
   * Normalize document result format
   */
  private normalizeDocumentResult = (doc: any): DocumentResult => {
    return {
      id: doc.id,
      content: doc.content,
      title: doc.title || undefined,
      source: doc.source || undefined,
      category: doc.category || undefined,
      file_name: doc.file_name || undefined,
      file_type: doc.file_type || undefined,
      similarity: doc.similarity || 0,
      keyword_rank: doc.keyword_rank || 0,
      combined_score: doc.combined_score || doc.similarity || 0,
      created_at: doc.created_at
    };
  };

  /**
   * Get document by ID for context
   */
  async getDocumentById(id: string): Promise<DocumentResult | null> {
    try {
      const { data, error } = await supabase
        .from('document_chunks')
        .select(`
          id,
          content,
          documents!inner(
            id,
            title,
            source,
            category,
            file_name,
            file_type
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error('[Hybrid Retrieval] Get document error:', error);
        return null;
      }

      if (!data) return null;

      const docData = data as any;

      return this.normalizeDocumentResult({
        ...docData,
        title: docData.documents?.title,
        source: docData.documents?.source,
        category: docData.documents?.category,
        file_name: docData.documents?.file_name,
        file_type: docData.documents?.file_type
      });
    } catch (error) {
      console.error('[Hybrid Retrieval] Get document failed:', error);
      return null;
    }
  }

  /**
   * Get recent documents (for fallback when no search results)
   */
  async getRecentDocuments(limit: number = 5): Promise<DocumentResult[]> {
    try {
      // Simple query without ordering by created_at
      const { data, error } = await supabase
        .from('document_chunks')
        .select(`
          id,
          content,
          documents!inner(
            id,
            title,
            source,
            category,
            file_name,
            file_type
          )
        `)
        .limit(limit);

      if (error) {
        console.error('[Hybrid Retrieval] Get recent documents error:', error);
        return [];
      }

      return (data || []).map((chunk: any) => ({
        ...this.normalizeDocumentResult({
          ...chunk,
          title: chunk.documents?.title,
          source: chunk.documents?.source,
          category: chunk.documents?.category,
          file_name: chunk.documents?.file_name,
          file_type: chunk.documents?.file_type
        }),
        combined_score: 0.5 // Default score for recent docs
      }));

    } catch (error) {
      console.error('[Hybrid Retrieval] Get recent documents failed:', error);
      return [];
    }
  }
}

// Export singleton instance
export const hybridRetrieval = new HybridRetrieval();
