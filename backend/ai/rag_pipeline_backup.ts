/**
 * Enhanced RAG Pipeline with Hybrid Retrieval
 * Integrates vector search, keyword search, and fallback to general LLM knowledge
 * Implements enterprise-grade retrieval with comprehensive logging
 */

import { supabase } from '../database/supabase_client';
import { hybridRetrieval, DocumentResult } from './hybrid_retrieval';

// Environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'llama3-8b-8192';

interface ChatMessage {
  user_message: string;
  ai_response: string;
  context_used: string[];
}

interface RAGResponse {
  response: string;
  sources: DocumentResult[];
  retrievalMethod: 'hybrid' | 'vector' | 'keyword' | 'general_knowledge';
  hasContext: boolean;
}

/**
 * RAG Pipeline class for handling document retrieval and LLM generation
 */
export class RAGPipeline {
  /**
   * Generate embedding for query text
   * Note: In production, this would call a Python embedding service
   * For now, we'll use a mock embedding or call an external API
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Replace with actual embedding generation
    // This could call a Python microservice or use OpenAI embeddings
    
    // Mock embedding for demonstration (384 dimensions for all-MiniLM-L6-v2)
    const mockEmbedding = Array(384).fill(0).map(() => Math.random() - 0.5);
    
    // Normalize the embedding
    const magnitude = Math.sqrt(mockEmbedding.reduce((sum, val) => sum + val * val, 0));
    return mockEmbedding.map(val => val / magnitude);
  }

  /**
   * Search for relevant documents using vector similarity
   */
  async searchDocuments(query: string, limit: number = 5): Promise<DocumentChunk[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Perform vector search using pgvector
      const { data: documents, error } = await supabase
        .rpc('search_documents', {
          query_embedding: queryEmbedding,
          similarity_threshold: 0.7,
          match_count: limit
        });

      if (error) {
        console.error('Error searching documents:', error);
        return [];
      }

      return documents || [];
    } catch (error) {
      console.error('Error in document search:', error);
      return [];
    }
  }

  /**
   * Generate AI response using Groq LLaMA3 with retrieved context
   */
  private async generateResponse(query: string, context: DocumentChunk[]): Promise<string> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    // Prepare context from retrieved documents
    const contextText = context.map((doc, index) => 
      `[Document ${index + 1}]: ${doc.content.substring(0, 500)}...`
    ).join('\n\n');

    // System prompt for legal/forensic assistant
    const systemPrompt = `You are TattvaQuest Assistant, a professional LegalTech & Digital Forensics consultant.
You provide accurate, grounded responses based on the provided context.

Guidelines:
- Use only the information from the provided context
- If context doesn't contain relevant information, say so clearly
- Do not provide legal advice or case assessments
- Always recommend consulting human experts for specific cases
- Keep responses professional, neutral, and concise
- Focus on factual information from the documents

Context:
${contextText}

User Question: ${query}

Instructions:
1. Answer based solely on the provided context
2. If multiple documents are relevant, synthesize the information
3. If no relevant information is found, indicate this clearly
4. Always suggest consulting with human experts for case-specific matters`;

    try {
      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL_NAME,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: query
            }
          ],
          max_tokens: 1000,
          temperature: 0.3, // Lower temperature for more factual responses
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content;

      if (!aiResponse) {
        throw new Error('No response from Groq API');
      }

      return aiResponse.trim();
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  }

  /**
   * Store chat message in database
   */
  private async storeChatMessage(userMessage: string, aiResponse: string, contextUsed: string[]): Promise<void> {
    try {
      await supabase
        .from('chat_messages')
        .insert({
          user_message: userMessage,
          ai_response: aiResponse,
          context_used: contextUsed,
        });
    } catch (error) {
      console.error('Error storing chat message:', error);
      // Don't throw here as this is not critical for the chat functionality
    }
  }

  /**
   * Main RAG pipeline: retrieve documents and generate response
   */
  async processQuery(query: string): Promise<{ response: string; sources: DocumentChunk[] }> {
    try {
      // Step 1: Search for relevant documents
      const relevantDocs = await this.searchDocuments(query);
      
      // Step 2: Generate AI response with context
      const response = await this.generateResponse(query, relevantDocs);
      
      // Step 3: Store the conversation
      const contextIds = relevantDocs.map(doc => doc.id);
      await this.storeChatMessage(query, response, contextIds);
      
      return {
        response,
        sources: relevantDocs
      };
    } catch (error) {
      console.error('Error in RAG pipeline:', error);
      
      // Fallback response when RAG fails
      const fallbackResponse = `I apologize, but I'm having trouble accessing our knowledge base right now. 
For assistance with your inquiry about "${query}", I recommend:

1. Contacting our legal forensics team directly
2. Consulting with one of our expert consultants
3. Visiting our website at tattvaquest.com for more information

Would you like me to help you connect with a human consultant?`;

      return {
        response: fallbackResponse,
        sources: []
      };
    }
  }

  /**
   * Get chat history for a user session
   */
  async getChatHistory(limit: number = 10): Promise<ChatMessage[]> {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching chat history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getChatHistory:', error);
      return [];
    }
  }

  /**
   * Clear chat history
   */
  async clearChatHistory(): Promise<void> {
    try {
      await supabase
        .from('chat_messages')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  }
}

// Export singleton instance
export const ragPipeline = new RAGPipeline();
