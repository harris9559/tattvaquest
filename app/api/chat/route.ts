/**
 * Next.js API Route for AI Chat with RAG
 * Handles chat requests from LeadChatWidget.tsx
 * Integrates with RAG pipeline for document-grounded responses
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// TypeScript types for source documents
type SourceDocument = {
  id: string
  content: string
  title: string
  file_name: string
  category?: string
  similarity: number
}

type DocumentRow = {
  id: string
  content: string
  title: string
  file_name: string
  category: string | null
  created_at: string
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_ANON_KEY

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama3-70b-8192'

// Production RAG Pipeline with Supabase + Groq
const ragPipeline = {
  async processQuery(query: string) {
    console.log('[Chat API] Processing query with production RAG:', query)

    try {
      // Step 1: Fetch documents from Supabase
      const documents = await this.fetchDocuments(query)
      console.log('[Chat API] Fetched documents:', documents.length)

      // Step 2: Build context from documents
      const context = documents.map(d => d.content).join('\n\n')
      const hasContext = documents.length > 0

      // Step 3: Generate AI response via Groq
      const response = await this.generateGroqResponse(query, context, hasContext)

      return {
        response,
        sources: documents,
        retrievalMethod: hasContext ? 'hybrid' : 'general_knowledge',
        hasContext
      }
    } catch (error) {
      console.error('[Chat API] Error in RAG pipeline:', error)
      return {
        response: 'AI system temporarily unavailable.',
        sources: [],
        retrievalMethod: 'error',
        hasContext: false
      }
    }
  },

  async fetchDocuments(query: string): Promise<SourceDocument[]> {
    if (!supabase) {
      console.error('[Chat API] Supabase client not initialized')
      return []
    }

    try {
      // Query documents table with text search
      const { data, error } = await supabase
        .from('documents')
        .select('id, content, title, file_name, category, created_at')
        .or(`content.ilike.%${query}%,title.ilike.%${query}%`)
        .limit(5)

      if (error) {
        console.error('[Chat API] Supabase query error:', error)
        // Fallback: get recent documents
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('documents')
          .select('id, content, title, file_name, category, created_at')
          .limit(5)

        if (fallbackError || !fallbackData) {
          return []
        }

        return fallbackData.map((doc: DocumentRow) => ({
          id: doc.id,
          content: doc.content,
          title: doc.title || 'Untitled',
          file_name: doc.file_name || 'Unknown',
          category: doc.category || undefined,
          similarity: 0.85
        }))
      }

      if (!data || data.length === 0) {
        // No matches found, get recent documents
        const { data: recentData } = await supabase
          .from('documents')
          .select('id, content, title, file_name, category, created_at')
          .limit(5)

        if (!recentData) {
          return []
        }

        return recentData.map((doc: DocumentRow) => ({
          id: doc.id,
          content: doc.content,
          title: doc.title || 'Untitled',
          file_name: doc.file_name || 'Unknown',
          category: doc.category || undefined,
          similarity: 0.85
        }))
      }

      return data.map((doc: DocumentRow) => ({
        id: doc.id,
        content: doc.content,
        title: doc.title || 'Untitled',
        file_name: doc.file_name || 'Unknown',
        category: doc.category || undefined,
        similarity: 0.85
      }))
    } catch (error) {
      console.error('[Chat API] Error fetching documents:', error)
      return []
    }
  },

  async generateGroqResponse(
    query: string,
    context: string,
    hasContext: boolean
  ): Promise<string> {
    if (!GROQ_API_KEY) {
      console.error('[Chat API] GROQ_API_KEY not configured')
      return 'AI system temporarily unavailable.'
    }

    try {
      const systemPrompt = 'You are an expert digital forensics investigation assistant.'

      const userPrompt = hasContext
        ? `Evidence:\n${context}\n\nQuestion:\n${query}\n\nAnalyze the evidence and provide a clear investigation answer.`
        : `Question:\n${query}\n\nProvide a helpful response based on general knowledge in digital forensics and legal technology.`

      const response = await fetch(GROQ_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 1500,
          temperature: 0.3
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Chat API] Groq API error:', response.status, errorText)
        return 'AI system temporarily unavailable.'
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        console.error('[Chat API] No content in Groq response')
        return 'AI system temporarily unavailable.'
      }

      return content.trim()
    } catch (error) {
      console.error('[Chat API] Error calling Groq:', error)
      return 'AI system temporarily unavailable.'
    }
  },

  async getChatHistory(limit: number) {
    if (!supabase) {
      return []
    }

    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('user_message, ai_response, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('[Chat API] Error fetching chat history:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('[Chat API] Error in getChatHistory:', error)
      return []
    }
  },

  async clearChatHistory() {
    if (!supabase) {
      return true
    }

    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (error) {
        console.error('[Chat API] Error clearing chat history:', error)
      }

      return true
    } catch (error) {
      console.error('[Chat API] Error in clearChatHistory:', error)
      return true
    }
  }
}

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

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required and must be a string' },
        { status: 400 }
      )
    }

    if (message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      )
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'Message is too long (max 2000 characters)' },
        { status: 400 }
      )
    }

    console.log(
      `[Chat API] Processing message: ${message.substring(0, 100)}...`
    )

    // Process the query through RAG pipeline
    const result = await ragPipeline.processQuery(message);

    const response = {
      reply: result.response,
      sources: result.sources.map(source => ({
        id: source.id,
        content:
          source.content.substring(0, 200) +
          (source.content.length > 200 ? '...' : ''),
        similarity: source.similarity,
        file_name: source.file_name || 'Unknown Document'
      }))
    }

    console.log(
      `[Chat API] Generated response with ${result.sources.length} sources`
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Chat API] Error processing request:', error)

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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get chat history from RAG pipeline
    const messages = await ragPipeline.getChatHistory(limit);

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('[Chat API] Error fetching history:', error)

    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/chat
 * 
 * Clear chat history for the current session
 */
export async function DELETE() {
  try {
    await ragPipeline.clearChatHistory()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Chat API] Error clearing history:', error)

    return NextResponse.json(
      { error: 'Failed to clear chat history' },
      { status: 500 }
    )
  }
}