/**
 * Standalone API handler for chat functionality
 * Can be used with Express.js if needed
 * Alternative to Next.js API routes
 */

import { ragPipeline } from '../ai/rag_pipeline';

interface ChatRequest {
  message: string;
  session_id?: string;
}

interface ChatResponse {
  reply: string;
  sources: Array<{
    id: string;
    content: string;
    similarity: number;
    file_name: string;
    title?: string;
    source?: string;
    category?: string;
  }>;
  retrieval_method?: string;
  has_context?: boolean;
}

/**
 * Express.js handler for POST /api/chat
 */
export async function handleChatRequest(req: any, res: any) {
  try {
    const { message }: ChatRequest = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string'
      });
    }

    if (message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message cannot be empty'
      });
    }

    if (message.length > 2000) {
      return res.status(400).json({
        error: 'Message is too long (max 2000 characters)'
      });
    }

    console.log(`[Chat Handler] Processing message: ${message.substring(0, 100)}...`);

    // Process through RAG pipeline
    const result = await ragPipeline.processQuery(message);

    // Format response
    const response: ChatResponse = {
      reply: result.response,
      sources: result.sources.map(source => ({
        id: source.id,
        content: source.content.substring(0, 200) + (source.content.length > 200 ? '...' : ''),
        similarity: source.similarity,
        file_name: source.file_name || 'Unknown Document'
      }))
    };

    console.log(`[Chat Handler] Generated response with ${result.sources.length} sources`);

    res.json(response);

  } catch (error) {
    console.error('[Chat Handler] Error:', error);

    const errorResponse: ChatResponse = {
      reply: "I apologize, but I'm experiencing technical difficulties. For immediate assistance, please contact our legal forensics team directly.",
      sources: []
    };

    res.status(500).json(errorResponse);
  }
}

/**
 * Express.js handler for GET /api/chat (chat history)
 */
export async function handleChatHistory(req: any, res: any) {
  try {
    const limit = parseInt(req.query.limit || '10');
    const messages = await ragPipeline.getChatHistory(limit);
    res.json({ messages });
  } catch (error) {
    console.error('[Chat Handler] History error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
}

/**
 * Express.js handler for DELETE /api/chat (clear history)
 */
export async function handleClearChat(req: any, res: any) {
  try {
    await ragPipeline.clearChatHistory();
    res.json({ success: true });
  } catch (error) {
    console.error('[Chat Handler] Clear error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
}
