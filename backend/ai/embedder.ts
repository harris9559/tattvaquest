/**
 * Embedding Generation Module for TattvaQuest eDiscovery
 * Uses HuggingFace Inference API with free open-source models
 * Model: BAAI/bge-small-en-v1.5 (384 dimensions)
 */

// HuggingFace Inference API endpoint
const HUGGINGFACE_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction';
const EMBEDDING_MODEL = 'BAAI/bge-small-en-v1.5';
const EMBEDDING_DIMENSION = 384;

// Get API key from environment (optional - can work without key but with rate limits)
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;

export class Embedder {
  private readonly batchSize = 10; // Process chunks in batches to avoid timeouts
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  /**
   * Generate embedding for a single text chunk
   */
  async generateEmbedding(text: string): Promise<number[]> {
    console.log('[Embedder] Generating embedding for text...');
    
    // Clean and truncate text if needed
    const cleanedText = this.cleanText(text);
    
    try {
      const embedding = await this.callHuggingFaceAPI(cleanedText);
      console.log('[Embedder] Embedding generated successfully, dimension:', embedding.length);
      return embedding;
    } catch (error) {
      console.error('[Embedder] HuggingFace API error:', error);
      console.log('[Embedder] Falling back to mock embedding');
      return this.generateMockEmbedding();
    }
  }

  /**
   * Generate embeddings for multiple chunks in batches
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    console.log(`[Embedder] Generating embeddings for ${texts.length} chunks...`);
    
    const embeddings: number[][] = [];
    
    // Process in batches
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      console.log(`[Embedder] Processing batch ${Math.floor(i / this.batchSize) + 1}/${Math.ceil(texts.length / this.batchSize)}`);
      
      try {
        // Try batch API call first
        const batchEmbeddings = await this.callHuggingFaceAPIBatch(batch);
        embeddings.push(...batchEmbeddings);
      } catch (error) {
        console.warn('[Embedder] Batch API failed, falling back to individual calls');
        
        // Fallback: process individually
        for (const text of batch) {
          try {
            const embedding = await this.generateEmbedding(text);
            embeddings.push(embedding);
          } catch (err) {
            console.error('[Embedder] Failed to generate embedding for chunk:', err);
            embeddings.push(this.generateMockEmbedding());
          }
        }
      }
      
      // Small delay between batches to be nice to the API
      if (i + this.batchSize < texts.length) {
        await this.sleep(500);
      }
    }
    
    console.log(`[Embedder] Generated ${embeddings.length} embeddings`);
    return embeddings;
  }

  /**
   * Call HuggingFace Inference API for single text
   */
  private async callHuggingFaceAPI(text: string): Promise<number[]> {
    const url = `${HUGGINGFACE_API_URL}/${EMBEDDING_MODEL}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (HUGGINGFACE_API_KEY) {
      headers['Authorization'] = `Bearer ${HUGGINGFACE_API_KEY}`;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            inputs: text,
            options: {
              wait_for_model: true // Wait if model is loading
            }
          })
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`[Embedder] Rate limited (attempt ${attempt}), waiting...`);
            await this.sleep(this.retryDelay * attempt);
            continue;
          }
          throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // HuggingFace returns array of embeddings (even for single input)
        if (Array.isArray(result)) {
          return result[0];
        }
        
        throw new Error('Unexpected response format from HuggingFace API');
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          console.warn(`[Embedder] Attempt ${attempt} failed, retrying...`);
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError || new Error('Failed to generate embedding after all retries');
  }

  /**
   * Call HuggingFace Inference API for batch of texts
   */
  private async callHuggingFaceAPIBatch(texts: string[]): Promise<number[][]> {
    const url = `${HUGGINGFACE_API_URL}/${EMBEDDING_MODEL}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (HUGGINGFACE_API_KEY) {
      headers['Authorization'] = `Bearer ${HUGGINGFACE_API_KEY}`;
    }

    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            inputs: texts,
            options: {
              wait_for_model: true
            }
          })
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`[Embedder] Rate limited on batch (attempt ${attempt}), waiting...`);
            await this.sleep(this.retryDelay * attempt);
            continue;
          }
          throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        if (Array.isArray(result) && result.length === texts.length) {
          return result;
        }
        
        throw new Error('Unexpected batch response format from HuggingFace API');
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          console.warn(`[Embedder] Batch attempt ${attempt} failed, retrying...`);
          await this.sleep(this.retryDelay * attempt);
        }
      }
    }
    
    throw lastError || new Error('Failed to generate batch embeddings after all retries');
  }

  /**
   * Generate mock embedding for fallback/testing
   */
  private generateMockEmbedding(): number[] {
    // Generate normalized random vector
    const embedding: number[] = [];
    let sum = 0;
    
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      const val = Math.random() * 2 - 1; // -1 to 1
      embedding.push(val);
      sum += val * val;
    }
    
    // Normalize to unit length
    const magnitude = Math.sqrt(sum);
    return embedding.map(val => val / magnitude);
  }

  /**
   * Clean and prepare text for embedding
   */
  private cleanText(text: string): string {
    return text
      .substring(0, 500) // HuggingFace has token limits, truncate if needed
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Sleep helper for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get embedding dimension
   */
  getEmbeddingDimension(): number {
    return EMBEDDING_DIMENSION;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(embeddingA: number[], embeddingB: number[]): number {
    if (embeddingA.length !== embeddingB.length) {
      throw new Error('Embedding dimensions do not match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < embeddingA.length; i++) {
      dotProduct += embeddingA[i] * embeddingB[i];
      normA += embeddingA[i] * embeddingA[i];
      normB += embeddingB[i] * embeddingB[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

// Export singleton instance
export const embedder = new Embedder();
