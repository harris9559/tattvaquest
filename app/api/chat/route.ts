/**
 * Next.js API Route for AI Chat with RAG
 * Handles chat requests from LeadChatWidget.tsx
 * Integrates with RAG pipeline for document-grounded responses
 */

import { NextRequest, NextResponse } from 'next/server';
// Import the enhanced RAG pipeline with hybrid retrieval
// Note: In production, ensure the backend modules are properly bundled
const ragPipeline = {
  async processQuery(query: string) {
    console.log('[Chat API] Processing query with hybrid RAG:', query);
    
    // Mock hybrid RAG implementation for Next.js API route
    // In production, this would call the actual hybrid retrieval system
    
    try {
      // Simulate hybrid search results
      const mockDocuments = [
        {
          id: 'doc-1',
          content: 'Digital forensics involves the recovery and investigation of material found in digital devices...',
          title: 'Digital Forensics Guide',
          source: 'Internal Documentation',
          category: 'Forensics',
          similarity: 0.85,
          keyword_rank: 0.9,
          combined_score: 0.87,
          created_at: new Date().toISOString()
        }
      ].filter(doc => 
        doc.content.toLowerCase().includes(query.toLowerCase()) || 
        doc.title.toLowerCase().includes(query.toLowerCase())
      );

      const hasContext = mockDocuments.length > 0;
      
      // Generate response using general knowledge (simulated)
      let response = '';
      
      if (query.toLowerCase().includes('digital forensics')) {
        response = 'Digital forensics is the process of uncovering and interpreting electronic data. The goal is to preserve any evidence found in its most original form while performing a structured investigation by collecting, identifying, and validating the digital information.';
      } else if (query.toLowerCase().includes('legal technology')) {
        response = 'Legal technology refers to the use of technology and software to enhance legal services and improve efficiency in legal workflows. This includes e-discovery tools, case management systems, and AI-powered legal research platforms.';
      } else if (query.toLowerCase().includes('incident response')) {
        response = 'Incident response is the organized approach to addressing and managing the aftermath of a security breach or cyber attack. It involves containment, eradication, recovery, and lessons learned to prevent future incidents.';
      } else {
        response = `I understand you're asking about "${query}". Based on general knowledge in the legal and forensic technology domain, I recommend consulting with our expert team for specific guidance tailored to your needs.`;
      }

      console.log('[Chat API] Hybrid RAG response generated');
      console.log('[Chat API] Has context:', hasContext);
      console.log('[Chat API] Sources found:', mockDocuments.length);

      return {
        response,
        sources: mockDocuments,
        retrievalMethod: hasContext ? 'hybrid' : 'general_knowledge',
        hasContext
      };

    } catch (error) {
      console.error('[Chat API] Error in hybrid RAG:', error);
      
      return {
        response: `I apologize, but I'm having trouble accessing our knowledge base right now. For assistance with "${query}", please contact our legal forensics team directly.`,
        sources: [],
        retrievalMethod: 'error',
        hasContext: false
      };
    }
  }
};

/**
 * POST /api/chat
 * 
 * Request body:
 * {
 *   "message": "User's question or message",
 *   "session_id": "optional session identifier"
 * }
 * 
 * Response:
 * {
 *   "reply": "AI response text",
 *   "sources": [
 *     {
 *       "id": "document_id",
 *       "content": "relevant content snippet",
 *       "similarity": 0.85,
 *       "file_name": "source_document.pdf"
 *     }
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { message } = body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      );
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message is too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    console.log(`[Chat API] Processing message: ${message.substring(0, 100)}...`);

    // Process the query through RAG pipeline
    const result = await ragPipeline.processQuery(message);

    // Format response for frontend
    const response = {
      reply: result.response,
      sources: result.sources.map(source => ({
        id: source.id,
        content: source.content.substring(0, 200) + (source.content.length > 200 ? '...' : ''),
        similarity: source.similarity,
        file_name: source.file_name || 'Unknown Document'
      }))
    };

    console.log(`[Chat API] Generated response with ${result.sources.length} sources`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Chat API] Error processing request:', error);

    // Return a graceful error response
    const errorResponse = {
      reply: "I apologize, but I'm experiencing technical difficulties right now. For immediate assistance, please contact our legal forensics team directly or visit tattvaquest.com.",
      sources: []
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET /api/chat
 * 
 * Retrieve chat history for the current session
 * 
 * Response:
 * {
 *   "messages": [
 *     {
 *       "user_message": "User's question",
 *       "ai_response": "AI response",
 *       "created_at": "2024-03-07T18:00:00Z"
 *     }
 *   ]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Get chat history from RAG pipeline
    const messages = await ragPipeline.getChatHistory(limit);

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('[Chat API] Error fetching history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/chat
 * 
 * Clear chat history for the current session
 */
export async function DELETE() {
  try {
    await ragPipeline.clearChatHistory();
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Chat API] Error clearing history:', error);
    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    );
  }
}
