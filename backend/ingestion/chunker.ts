/**
 * Document Chunking Module for TattvaQuest eDiscovery
 * Splits text into semantically meaningful chunks for vector storage
 * Optimized for legal and forensic document analysis
 */

export interface DocumentChunk {
  chunk_index: number;
  content: string;
  token_count: number;
  start_char: number;
  end_char: number;
}

export class DocumentChunker {
  // Target chunk size: 500-700 tokens (roughly 2000-2800 characters for English)
  private readonly TARGET_CHUNK_SIZE = 2500;
  private readonly MIN_CHUNK_SIZE = 1000;
  private readonly MAX_CHUNK_SIZE = 4000;
  
  // Average characters per token (approximate for English)
  private readonly CHARS_PER_TOKEN = 4;

  /**
   * Main entry point: chunk text into semantic segments
   */
  chunkText(text: string): DocumentChunk[] {
    console.log('[Chunker] Starting text chunking...');
    
    if (!text || text.trim().length === 0) {
      console.warn('[Chunker] Empty text provided');
      return [];
    }

    // Clean the text
    const cleanedText = this.cleanText(text);
    
    // If text is small enough, return as single chunk
    if (cleanedText.length <= this.TARGET_CHUNK_SIZE) {
      return [{
        chunk_index: 0,
        content: cleanedText,
        token_count: Math.ceil(cleanedText.length / this.CHARS_PER_TOKEN),
        start_char: 0,
        end_char: cleanedText.length
      }];
    }

    // Split into semantic chunks
    const chunks = this.createSemanticChunks(cleanedText);
    
    console.log(`[Chunker] Created ${chunks.length} chunks from ${cleanedText.length} characters`);
    
    return chunks;
  }

  /**
   * Clean and normalize text before chunking
   */
  private cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .trim();
  }

  /**
   * Create semantic chunks by respecting sentence and paragraph boundaries
   */
  private createSemanticChunks(text: string): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    let currentIndex = 0;
    let charPosition = 0;

    // Split into paragraphs first
    const paragraphs = text.split('\n\n').filter(p => p.trim().length > 0);
    
    let currentChunkContent: string[] = [];
    let currentChunkLength = 0;
    let chunkStartChar = 0;

    for (const paragraph of paragraphs) {
      const paragraphLength = paragraph.length;
      
      // If single paragraph exceeds max size, split it further
      if (paragraphLength > this.MAX_CHUNK_SIZE) {
        // Save current chunk if exists
        if (currentChunkContent.length > 0) {
          const chunkText = currentChunkContent.join('\n\n');
          chunks.push({
            chunk_index: currentIndex++,
            content: chunkText,
            token_count: Math.ceil(chunkText.length / this.CHARS_PER_TOKEN),
            start_char: chunkStartChar,
            end_char: charPosition
          });
          currentChunkContent = [];
          currentChunkLength = 0;
        }
        
        // Split large paragraph by sentences
        const sentenceChunks = this.splitBySentences(paragraph, charPosition);
        for (const sentenceChunk of sentenceChunks) {
          chunks.push({
            chunk_index: currentIndex++,
            content: sentenceChunk.content,
            token_count: Math.ceil(sentenceChunk.content.length / this.CHARS_PER_TOKEN),
            start_char: sentenceChunk.start_char,
            end_char: sentenceChunk.end_char
          });
        }
        charPosition += paragraphLength + 2; // +2 for \n\n
        chunkStartChar = charPosition;
      } else {
        // Check if adding this paragraph would exceed target size
        if (currentChunkLength + paragraphLength > this.TARGET_CHUNK_SIZE && currentChunkContent.length > 0) {
          // Save current chunk
          const chunkText = currentChunkContent.join('\n\n');
          chunks.push({
            chunk_index: currentIndex++,
            content: chunkText,
            token_count: Math.ceil(chunkText.length / this.CHARS_PER_TOKEN),
            start_char: chunkStartChar,
            end_char: charPosition
          });
          
          // Start new chunk
          currentChunkContent = [paragraph];
          currentChunkLength = paragraphLength;
          chunkStartChar = charPosition;
        } else {
          // Add to current chunk
          currentChunkContent.push(paragraph);
          currentChunkLength += paragraphLength + 2; // +2 for separator
        }
        
        charPosition += paragraphLength + 2;
      }
    }

    // Don't forget the last chunk
    if (currentChunkContent.length > 0) {
      const chunkText = currentChunkContent.join('\n\n');
      chunks.push({
        chunk_index: currentIndex,
        content: chunkText,
        token_count: Math.ceil(chunkText.length / this.CHARS_PER_TOKEN),
        start_char: chunkStartChar,
        end_char: charPosition - 2 // Remove trailing separator
      });
    }

    return this.optimizeChunks(chunks);
  }

  /**
   * Split a large text by sentences
   */
  private splitBySentences(text: string, baseCharPosition: number): Array<{content: string, start_char: number, end_char: number}> {
    const results: Array<{content: string, start_char: number, end_char: number}> = [];
    
    // Sentence delimiters: period, exclamation, question mark followed by space or end
    const sentenceRegex = /[^.!?]+[.!?]+\s*/g;
    const sentences: Array<{text: string, start: number, end: number}> = [];
    
    let match;
    while ((match = sentenceRegex.exec(text)) !== null) {
      sentences.push({
        text: match[0].trim(),
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // If no sentences found, split by character count
    if (sentences.length === 0) {
      let pos = 0;
      while (pos < text.length) {
        const chunk = text.substring(pos, pos + this.TARGET_CHUNK_SIZE);
        results.push({
          content: chunk,
          start_char: baseCharPosition + pos,
          end_char: baseCharPosition + pos + chunk.length
        });
        pos += this.TARGET_CHUNK_SIZE;
      }
      return results;
    }
    
    // Group sentences into chunks
    let currentChunk: string[] = [];
    let currentLength = 0;
    let chunkStart = sentences[0].start;
    
    for (const sentence of sentences) {
      if (currentLength + sentence.text.length > this.TARGET_CHUNK_SIZE && currentChunk.length > 0) {
        results.push({
          content: currentChunk.join(' '),
          start_char: baseCharPosition + chunkStart,
          end_char: baseCharPosition + sentence.start
        });
        currentChunk = [sentence.text];
        currentLength = sentence.text.length;
        chunkStart = sentence.start;
      } else {
        currentChunk.push(sentence.text);
        currentLength += sentence.text.length + 1; // +1 for space
      }
    }
    
    // Add final chunk
    if (currentChunk.length > 0) {
      results.push({
        content: currentChunk.join(' '),
        start_char: baseCharPosition + chunkStart,
        end_char: baseCharPosition + text.length
      });
    }
    
    return results;
  }

  /**
   * Optimize chunks: merge very small ones, split very large ones
   */
  private optimizeChunks(chunks: DocumentChunk[]): DocumentChunk[] {
    if (chunks.length <= 1) return chunks;
    
    const optimized: DocumentChunk[] = [];
    let i = 0;
    
    while (i < chunks.length) {
      const current = chunks[i];
      
      // If chunk is too small and not the first one, try to merge with previous
      if (current.content.length < this.MIN_CHUNK_SIZE && optimized.length > 0) {
        const previous = optimized[optimized.length - 1];
        const combinedContent = previous.content + '\n\n' + current.content;
        
        if (combinedContent.length <= this.MAX_CHUNK_SIZE) {
          // Merge with previous
          optimized[optimized.length - 1] = {
            chunk_index: previous.chunk_index,
            content: combinedContent,
            token_count: Math.ceil(combinedContent.length / this.CHARS_PER_TOKEN),
            start_char: previous.start_char,
            end_char: current.end_char
          };
        } else {
          optimized.push(current);
        }
      } else {
        optimized.push(current);
      }
      
      i++;
    }
    
    // Re-index chunks
    return optimized.map((chunk, idx) => ({
      ...chunk,
      chunk_index: idx
    }));
  }

  /**
   * Estimate token count for a text string
   */
  estimateTokenCount(text: string): number {
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Get chunk statistics for logging/debugging
   */
  getChunkStats(chunks: DocumentChunk[]): {
    total_chunks: number;
    total_tokens: number;
    avg_chunk_size: number;
    min_chunk_size: number;
    max_chunk_size: number;
  } {
    const sizes = chunks.map(c => c.content.length);
    const tokens = chunks.map(c => c.token_count);
    
    return {
      total_chunks: chunks.length,
      total_tokens: tokens.reduce((a, b) => a + b, 0),
      avg_chunk_size: sizes.reduce((a, b) => a + b, 0) / sizes.length || 0,
      min_chunk_size: Math.min(...sizes),
      max_chunk_size: Math.max(...sizes)
    };
  }
}

// Export singleton instance
export const documentChunker = new DocumentChunker();
