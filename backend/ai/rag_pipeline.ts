/**
 * Enhanced RAG Pipeline with Hybrid Retrieval
 * Integrates vector search, keyword search, and fallback to general LLM knowledge
 * Implements enterprise-grade retrieval with comprehensive logging
 */

import { hybridRetrieval } from './hybrid_retrieval';
import { supabase } from '../database/supabase_client';

// Environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// API configurations
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const MODEL_NAME = 'llama-3.1-8b-instant'; // Current Groq model
const EMBEDDING_MODEL = 'text-embedding-3-small'; // OpenAI's latest embedding model

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
}

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
 * Enhanced RAG Pipeline with Hybrid Retrieval
 */
export class RAGPipeline {
  /**
   * Generate embedding for query text using OpenAI API
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    if (!OPENAI_API_KEY) {
      console.warn('[RAG Pipeline] OPENAI_API_KEY not set, using mock embedding');
      return this.generateMockEmbedding();
    }

    try {
      console.log('[RAG Pipeline] Generating embedding with OpenAI...');
      
      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
          encoding_format: 'float'
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const embedding = data.data?.[0]?.embedding;

      if (!embedding) {
        throw new Error('No embedding returned from OpenAI API');
      }

      console.log('[RAG Pipeline] Embedding generated successfully, dimension:', embedding.length);
      return embedding;

    } catch (error) {
      console.error('[RAG Pipeline] Error generating embedding:', error);
      console.log('[RAG Pipeline] Falling back to mock embedding');
      return this.generateMockEmbedding();
    }
  }

  /**
   * Generate mock embedding for fallback
   */
  private generateMockEmbedding(): number[] {
    // Mock embedding for demonstration (384 dimensions for HuggingFace BGE compatibility)
    const mockEmbedding = Array(384).fill(0).map(() => Math.random() - 0.5);
    
    // Normalize embedding
    const magnitude = Math.sqrt(mockEmbedding.reduce((sum, val) => sum + val * val, 0));
    return mockEmbedding.map(val => val / magnitude);
  }

  /**
   * Generate AI response using Groq LLaMA3 with enhanced context handling
   */
  private async generateResponse(
    query: string, 
    context: DocumentResult[], 
    hasContext: boolean
  ): Promise<string> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    // Prepare context from retrieved documents
    const contextText = context.map((doc, index) => 
      `[Document ${index + 1}]:\nTitle: ${doc.title || 'Untitled'}\nSource: ${doc.source || 'Unknown'}\nCategory: ${doc.category || 'General'}\nContent: ${doc.content.substring(0, 800)}...\n`
    ).join('\n---\n');

    // Enhanced system prompt for hybrid RAG
    const systemPrompt = `You are TattvaQuest AI assistant specializing in digital forensics, legal technology, and incident response.

CONTEXT HANDLING:
- If relevant documents are provided below, use them as your primary source of information
- If no documents are available or they don't contain relevant information, answer using your general knowledge
- Always prioritize accuracy and helpfulness over citing sources
- Be transparent about whether you're using provided context or general knowledge

${hasContext ? `RETRIEVED CONTEXT:\n${contextText}` : 'NO RELEVANT DOCUMENTS FOUND - Use your general knowledge'}

RESPONSE GUIDELINES:
- Provide professional, accurate, and helpful responses
- For legal/forensic questions: Give general guidance but recommend human consultation for specific cases
- If using context: Reference the information naturally without explicitly mentioning "Document X"
- If using general knowledge: Be clear that this is general information
- Keep responses concise but comprehensive
- Focus on practical, actionable advice

User Question: ${query}

Instructions:
1. If relevant information exists in context, use it to answer
2. If context is insufficient or irrelevant, use general knowledge
3. Always provide value to the user
4. Maintain professional tone appropriate for legal/forensic consulting
5. If the question requires case-specific advice, recommend consulting human experts`;

    try {
      console.log('[RAG Pipeline] Sending request to Groq...');
      console.log('[RAG Pipeline] Context documents:', context.length);
      console.log('[RAG Pipeline] Has context:', hasContext);

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
          max_tokens: 1500,
          temperature: 0.3, // Lower temperature for more consistent responses
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

      console.log('[RAG Pipeline] Received response from Groq');
      return aiResponse.trim();

    } catch (error) {
      console.error('[RAG Pipeline] Error generating AI response:', error);
      
      // Fallback response when AI generation fails
      return `I apologize, but I'm experiencing technical difficulties right now. 

For assistance with your inquiry about "${query}", I recommend:

1. Contacting our legal forensics team directly
2. Consulting with one of our expert consultants  
3. Visiting our website at tattvaquest.com for more resources

Would you like me to help you connect with a human consultant?`;
    }
  }

  /**
   * Store chat message in database
   */
  private async storeChatMessage(
    userMessage: string, 
    aiResponse: string, 
    contextUsed: string[]
  ): Promise<void> {
    try {
      await supabase
        .from('chat_messages')
        .insert({
          user_message: userMessage,
          ai_response: aiResponse,
          context_used: contextUsed,
        });
      
      console.log('[RAG Pipeline] Chat message stored successfully');
    } catch (error) {
      console.error('[RAG Pipeline] Error storing chat message:', error);
      // Don't throw here as this is not critical for chat functionality
    }
  }

  /**
   * Main hybrid RAG pipeline: retrieve documents and generate response
   */
  async processQuery(query: string): Promise<RAGResponse> {
    console.log('[RAG Pipeline] Processing query:', query);
    console.log('[RAG Pipeline] Starting hybrid retrieval...');

    try {
      // Step 1: Generate embedding for query
      const queryEmbedding = await this.generateEmbedding(query);
      console.log('[RAG Pipeline] Query embedding generated');

      // Step 2: Hybrid search (vector + keyword + metadata filtering)
      const relevantDocs = await hybridRetrieval.hybridSearch({
        query,
        embedding: queryEmbedding,
        limit: 5,
        similarityThreshold: 0.7
      });

      console.log('[RAG Pipeline] Retrieved documents:', relevantDocs.length);

      // Step 3: Determine if we have sufficient context
      const hasContext = relevantDocs.length > 0;
      const contextDocs = hasContext ? relevantDocs : [];

      // Step 4: Generate AI response with context
      const response = await this.generateResponse(query, contextDocs, hasContext);

      // Step 5: Store conversation
      await this.storeChatMessage(
        query, 
        response, 
        contextDocs.map(doc => doc.id)
      );

      // Step 6: Determine retrieval method for analytics
      let retrievalMethod: RAGResponse['retrievalMethod'] = 'general_knowledge';
      if (hasContext) {
        retrievalMethod = 'hybrid'; // We used hybrid search
      }

      const result: RAGResponse = {
        response,
        sources: contextDocs,
        retrievalMethod,
        hasContext
      };

      console.log('[RAG Pipeline] Query processed successfully');
      console.log('[RAG Pipeline] Retrieval method:', retrievalMethod);
      console.log('[RAG Pipeline] Final response length:', response.length);

      return result;

    } catch (error) {
      console.error('[RAG Pipeline] Error in RAG pipeline:', error);
      
      // Fallback response when entire pipeline fails
      const fallbackResponse = `I apologize, but I'm having trouble accessing our knowledge base right now. 

For your inquiry about "${query}", I can provide some general guidance:

For digital forensics and legal technology questions:
- Start with identifying the specific type of issue or question
- Gather relevant documentation and evidence
- Consider both technical and procedural aspects
- Always validate findings with established methodologies

For case-specific matters:
- Consult with qualified legal professionals
- Follow established forensic protocols
- Maintain proper documentation and chain of custody

Would you like me to connect you with one of our human consultants who can provide specialized assistance?`;

      return {
        response: fallbackResponse,
        sources: [],
        retrievalMethod: 'general_knowledge',
        hasContext: false
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
        console.error('[RAG Pipeline] Error fetching chat history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[RAG Pipeline] Error in getChatHistory:', error);
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
      
      console.log('[RAG Pipeline] Chat history cleared');
    } catch (error) {
      console.error('[RAG Pipeline] Error clearing chat history:', error);
    }
  }

  /**
   * eDiscovery Investigation Analysis
   * Specialized method for analyzing digital evidence
   */
  async analyzeEvidence(
    question: string,
    evidenceContext: string,
    hasEvidence: boolean
  ): Promise<string> {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not set');
    }

    const investigationPrompt = `You are an AI digital forensics assistant for TattvaQuest.

Your role is to analyze uploaded evidence and help investigators understand:
- Digital artifacts and their significance
- Suspicious activity patterns
- Timeline reconstruction from evidence
- Relevant digital evidence connections

ANALYSIS GUIDELINES:
- Answer clearly and cite retrieved evidence chunks
- Be objective and factual in your analysis
- Highlight patterns, anomalies, or suspicious activities
- Connect evidence from different sources when relevant
- Acknowledge limitations if evidence is insufficient
- Provide actionable insights for investigators

${hasEvidence ? `RETRIEVED EVIDENCE:
${evidenceContext}

Analyze the evidence above to answer the investigation question.` : 'NO EVIDENCE RETRIEVED - Provide general guidance on the investigation question.'}`;

    try {
      console.log('[RAG Pipeline] Generating investigation analysis...');

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
              content: investigationPrompt
            },
            {
              role: 'user',
              content: question
            }
          ],
          max_tokens: 2000,
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const analysis = data.choices?.[0]?.message?.content;

      if (!analysis) {
        throw new Error('No analysis generated from Groq API');
      }

      console.log('[RAG Pipeline] Investigation analysis generated');
      return analysis.trim();

    } catch (error) {
      console.error('[RAG Pipeline] Error generating investigation analysis:', error);
      
      return `I apologize, but I'm unable to provide AI analysis at this time due to technical difficulties.

For your investigation question: "${question}"

Please try:
1. Rephrasing your question
2. Checking if evidence files were properly uploaded
3. Contacting technical support if the issue persists

${hasEvidence ? `Evidence was found but could not be analyzed. ${evidenceContext.substring(0, 500)}...` : 'No evidence was found matching your query.'}`;
    }
  }
}

// Export singleton instance
export const ragPipeline = new RAGPipeline();
