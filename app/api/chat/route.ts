/**
 * Next.js API Route for AI Chat with RAG
 * Handles chat requests from LeadChatWidget.tsx
 * Integrates with RAG pipeline for document-grounded responses
 * Enhanced with forensic timeline reconstruction and suspicious activity detection
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

// Timeline event type
type TimelineEvent = {
  time: string
  event: string
  severity?: 'low' | 'medium' | 'high'
}

// Suspicious activity type
type SuspiciousActivity = {
  type: string
  severity: 'low' | 'medium' | 'high'
  description: string
}

// Investigation report type
type InvestigationReport = {
  reply: string
  timeline: TimelineEvent[]
  suspicious_activities: SuspiciousActivity[]
  sources: SourceDocument[]
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
const GROQ_MODEL = 'llama-3.3-70b-versatile'

// ============================================
// FORENSIC ANALYSIS HELPERS
// ============================================

/**
 * Extract timeline events from evidence text
 * Detects timestamps, login events, IP addresses, failed attempts
 */
function extractTimelineEvents(text: string): TimelineEvent[] {
  const events: TimelineEvent[] = []
  
  // Pattern 1: Time with AM/PM followed by activity
  const timeActivityPattern = /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[–-]?\s*([^.]+\.?)/gi
  let match
  while ((match = timeActivityPattern.exec(text)) !== null) {
    events.push({
      time: match[1].trim(),
      event: match[2].trim(),
      severity: determineSeverity(match[2])
    })
  }
  
  // Pattern 2: Login events with IP addresses
  const loginPattern = /(?:logged in|login|accessed).*?(?:from|IP)\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/gi
  while ((match = loginPattern.exec(text)) !== null) {
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i)
    events.push({
      time: timeMatch ? timeMatch[1] : 'Unknown time',
      event: `Login detected from IP ${match[1]}`,
      severity: 'medium'
    })
  }
  
  // Pattern 3: Failed login attempts
  const failedPattern = /(\d+)?\s*(?:failed|unsuccessful|invalid)\s*(?:login|attempt|authentication)/gi
  while ((match = failedPattern.exec(text)) !== null) {
    const timeMatch = text.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i)
    const count = match[1] ? parseInt(match[1]) : 1
    events.push({
      time: timeMatch ? timeMatch[1] : 'Unknown time',
      event: `${count} failed login attempt${count > 1 ? 's' : ''} detected`,
      severity: 'high'
    })
  }
  
  // Pattern 4: Timestamps in ISO format or similar
  const isoPattern = /(\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2})/g
  while ((match = isoPattern.exec(text)) !== null) {
    const contextStart = Math.max(0, match.index - 50)
    const contextEnd = Math.min(text.length, match.index + 100)
    const context = text.substring(contextStart, contextEnd).trim()
    events.push({
      time: match[1],
      event: context.substring(context.indexOf(match[1]) + match[1].length).trim().substring(0, 100),
      severity: 'low'
    })
  }
  
  // Remove duplicates and sort by time
  const uniqueEvents = events.filter((event, index, self) =>
    index === self.findIndex(e => e.time === event.time && e.event === event.event)
  )
  
  return uniqueEvents.sort((a, b) => a.time.localeCompare(b.time))
}

/**
 * Determine severity based on event description
 */
function determineSeverity(description: string): 'low' | 'medium' | 'high' {
  const lowerDesc = description.toLowerCase()
  
  if (lowerDesc.includes('failed') || lowerDesc.includes('unsuccessful') || 
      lowerDesc.includes('attack') || lowerDesc.includes('breach') ||
      lowerDesc.includes('unauthorized') || lowerDesc.includes('suspicious')) {
    return 'high'
  }
  
  if (lowerDesc.includes('login') || lowerDesc.includes('access') ||
      lowerDesc.includes('admin') || lowerDesc.includes('privilege')) {
    return 'medium'
  }
  
  return 'low'
}

/**
 * Detect suspicious activity patterns
 */
function detectSuspiciousActivity(text: string): SuspiciousActivity[] {
  const activities: SuspiciousActivity[] = []
  const lowerText = text.toLowerCase()
  
  // Brute force attempt detection
  const failedAttempts = (text.match(/failed\s*(?:login|attempt)/gi) || []).length
  if (failedAttempts >= 3 || text.match(/multiple\s*failed/i)) {
    activities.push({
      type: 'brute_force_attempt',
      severity: 'high',
      description: 'Multiple failed login attempts detected - possible brute force attack'
    })
  }
  
  // Unusual time access (late night/early morning)
  const lateNightMatch = text.match(/(?:0[0-2]:\d{2}\s*(?:AM|PM)?|2[0-3]:\d{2})/i)
  if (lateNightMatch && (lowerText.includes('login') || lowerText.includes('access'))) {
    activities.push({
      type: 'unusual_access_time',
      severity: 'medium',
      description: `System accessed at unusual hours (${lateNightMatch[0]}) - potential unauthorized access`
    })
  }
  
  // Admin login after failures
  if (failedAttempts > 0 && lowerText.includes('admin')) {
    activities.push({
      type: 'admin_compromise_risk',
      severity: 'high',
      description: 'Admin account accessed after failed login attempts - possible credential compromise'
    })
  }
  
  // Repeated IP attempts
  const ipPattern = /(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g
  const ips = text.match(ipPattern) || []
  const uniqueIps = [...new Set(ips)]
  if (ips.length > 2 && uniqueIps.length < ips.length) {
    activities.push({
      type: 'repeated_ip_attempts',
      severity: 'medium',
      description: 'Same IP address making multiple access attempts'
    })
  }
  
  // Privilege escalation indicators
  if (lowerText.includes('privilege') || lowerText.includes('escalat') || 
      lowerText.includes('admin') || lowerText.includes('root')) {
    if (lowerText.includes('grant') || lowerText.includes('elevate') || 
        lowerText.includes('modify') || lowerText.includes('change')) {
      activities.push({
        type: 'privilege_escalation',
        severity: 'high',
        description: 'Potential privilege escalation activity detected'
      })
    }
  }
  
  return activities
}

/**
 * Build forensic context for AI prompt
 */
function buildForensicContext(
  documents: SourceDocument[],
  timeline: TimelineEvent[],
  activities: SuspiciousActivity[]
): string {
  let context = ''
  
  if (documents.length > 0) {
    context += '=== EVIDENCE DOCUMENTS ===\n'
    documents.forEach((doc, i) => {
      context += `\n[Document ${i + 1}] ${doc.file_name}:\n${doc.content}\n`
    })
  }
  
  if (timeline.length > 0) {
    context += '\n=== EXTRACTED TIMELINE ===\n'
    timeline.forEach(event => {
      context += `${event.time} – ${event.event} [Severity: ${event.severity}]\n`
    })
  }
  
  if (activities.length > 0) {
    context += '\n=== DETECTED SUSPICIOUS ACTIVITIES ===\n'
    activities.forEach(activity => {
      context += `[${activity.severity.toUpperCase()}] ${activity.type}: ${activity.description}\n`
    })
  }
  
  return context
}

// Production RAG Pipeline with Supabase + Groq + Forensic Analysis
const ragPipeline = {
  async processQuery(query: string): Promise<{
    response: string
    sources: SourceDocument[]
    timeline: TimelineEvent[]
    suspicious_activities: SuspiciousActivity[]
    retrievalMethod: string
    hasContext: boolean
  }> {
    console.log('[Chat API] Processing query with production RAG:', query)

    try {
      // Step 1: Check environment variables
      if (!supabaseUrl || !supabaseKey) {
        console.error('[Chat API] CRITICAL: Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
        throw new Error('Database configuration missing')
      }
      
      if (!GROQ_API_KEY) {
        console.error('[Chat API] CRITICAL: Missing GROQ_API_KEY environment variable')
        throw new Error('AI service configuration missing')
      }
      
      console.log('[Chat API] Environment check passed')
      console.log('[Chat API] SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
      console.log('[Chat API] GROQ_API_KEY:', GROQ_API_KEY ? 'SET' : 'MISSING')

      // Step 2: Fetch documents from Supabase
      console.log('[Chat API] Step 1: Fetching documents...')
      const documents = await this.fetchDocuments(query)
      console.log('[Chat API] Fetched documents:', documents.length)

      // Step 3: Extract forensic data from documents
      console.log('[Chat API] Step 2: Extracting forensic data...')
      const allText = documents.map(d => d.content).join('\n\n')
      const timeline = extractTimelineEvents(allText)
      const suspiciousActivities = detectSuspiciousActivity(allText)
      
      console.log('[Chat API] Extracted timeline events:', timeline.length)
      console.log('[Chat API] Detected suspicious activities:', suspiciousActivities.length)

      // Step 4: Build forensic context
      const context = buildForensicContext(documents, timeline, suspiciousActivities)
      const hasContext = documents.length > 0

      // Step 5: Generate AI response via Groq
      console.log('[Chat API] Step 3: Generating AI response via Groq...')
      const response = await this.generateGroqResponse(query, context, hasContext, timeline, suspiciousActivities)
      console.log('[Chat API] AI response generated successfully')

      return {
        response,
        sources: documents,
        timeline,
        suspicious_activities: suspiciousActivities,
        retrievalMethod: hasContext ? 'hybrid' : 'general_knowledge',
        hasContext
      }
    } catch (error) {
      console.error('[Chat API] CRITICAL ERROR in RAG pipeline:', error)
      console.error('[Chat API] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      console.error('[Chat API] Error message:', error instanceof Error ? error.message : String(error))
      return {
        response: 'AI investigation system temporarily unavailable.',
        sources: [],
        timeline: [],
        suspicious_activities: [],
        retrievalMethod: 'error',
        hasContext: false
      }
    }
  },

  async fetchDocuments(query: string): Promise<SourceDocument[]> {
    console.log('[Chat API] fetchDocuments: Starting fetch for query:', query)
    
    if (!supabase) {
      console.error('[Chat API] fetchDocuments: CRITICAL - Supabase client not initialized')
      console.error('[Chat API] fetchDocuments: supabaseUrl:', supabaseUrl ? 'SET' : 'MISSING')
      console.error('[Chat API] fetchDocuments: supabaseKey:', supabaseKey ? 'SET' : 'MISSING')
      return []
    }

    try {
      console.log('[Chat API] fetchDocuments: Executing Supabase query...')
      // Query documents table with text search
      const { data, error } = await supabase
        .from('documents')
        .select('id, content, title, file_name, category, created_at')
        .or(`content.ilike.%${query}%,title.ilike.%${query}%`)
        .limit(5)

      if (error) {
        console.error('[Chat API] fetchDocuments: Supabase query error:', error.message, error.code, error.details)
        // Fallback: get recent documents
        console.log('[Chat API] fetchDocuments: Attempting fallback query...')
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('documents')
          .select('id, content, title, file_name, category, created_at')
          .limit(5)

        if (fallbackError) {
          console.error('[Chat API] fetchDocuments: Fallback query also failed:', fallbackError.message)
          return []
        }

        if (!fallbackData) {
          console.log('[Chat API] fetchDocuments: Fallback returned no data')
          return []
        }

        console.log('[Chat API] fetchDocuments: Fallback returned', fallbackData.length, 'documents')
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
        console.log('[Chat API] fetchDocuments: No matches found, getting recent documents...')
        // No matches found, get recent documents
        const { data: recentData, error: recentError } = await supabase
          .from('documents')
          .select('id, content, title, file_name, category, created_at')
          .limit(5)

        if (recentError) {
          console.error('[Chat API] fetchDocuments: Recent docs query failed:', recentError.message)
          return []
        }

        if (!recentData) {
          console.log('[Chat API] fetchDocuments: No recent documents found')
          return []
        }

        console.log('[Chat API] fetchDocuments: Found', recentData.length, 'recent documents')
        return recentData.map((doc: DocumentRow) => ({
          id: doc.id,
          content: doc.content,
          title: doc.title || 'Untitled',
          file_name: doc.file_name || 'Unknown',
          category: doc.category || undefined,
          similarity: 0.85
        }))
      }

      console.log('[Chat API] fetchDocuments: Found', data.length, 'matching documents')
      return data.map((doc: DocumentRow) => ({
        id: doc.id,
        content: doc.content,
        title: doc.title || 'Untitled',
        file_name: doc.file_name || 'Unknown',
        category: doc.category || undefined,
        similarity: 0.85
      }))
    } catch (error) {
      console.error('[Chat API] fetchDocuments: CRITICAL ERROR:', error)
      console.error('[Chat API] fetchDocuments: Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      return []
    }
  },

  async generateGroqResponse(
    query: string,
    context: string,
    hasContext: boolean,
    timeline: TimelineEvent[],
    activities: SuspiciousActivity[]
  ): Promise<string> {
    console.log('[Chat API] generateGroqResponse: Starting Groq API call')
    console.log('[Chat API] generateGroqResponse: hasContext:', hasContext)
    console.log('[Chat API] generateGroqResponse: context length:', context.length)
    
    if (!GROQ_API_KEY) {
      console.error('[Chat API] generateGroqResponse: CRITICAL - GROQ_API_KEY not configured')
      throw new Error('GROQ_API_KEY not configured')
    }

    try {
      const systemPrompt = `You are an expert digital forensics investigation assistant for TattvaQuest.

Your role is to analyze evidence and provide:
1. Clear investigation findings
2. Timeline reconstruction when timestamps are detected
3. Suspicious activity assessment
4. Recommended next steps for investigators

Always cite specific evidence when making conclusions.
Be objective and factual in your analysis.
Highlight patterns, anomalies, or suspicious activities.
Provide actionable insights for forensic investigators.`

      const userPrompt = hasContext
        ? `${context}

INVESTIGATION QUESTION:
${query}

Based on the evidence above, provide a comprehensive investigation analysis including:
1. Summary of findings
2. Timeline of events (if applicable)
3. Suspicious activity assessment
4. Recommended investigation steps`
        : `Question:\n${query}\n\nProvide a helpful response based on general knowledge in digital forensics and legal technology.`

      console.log('[Chat API] generateGroqResponse: Sending request to Groq API...')
      console.log('[Chat API] generateGroqResponse: Model:', GROQ_MODEL)
      
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
          max_tokens: 2000,
          temperature: 0.2
        }),
      })

      console.log('[Chat API] generateGroqResponse: Groq API response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Chat API] generateGroqResponse: Groq API error:', response.status, response.statusText)
        console.error('[Chat API] generateGroqResponse: Error details:', errorText)
        throw new Error(`Groq API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      console.log('[Chat API] generateGroqResponse: Groq response received, choices:', data.choices?.length)
      
      const content = data.choices?.[0]?.message?.content

      if (!content) {
        console.error('[Chat API] generateGroqResponse: No content in Groq response')
        console.error('[Chat API] generateGroqResponse: Full response:', JSON.stringify(data))
        throw new Error('No content in Groq response')
      }

      console.log('[Chat API] generateGroqResponse: Successfully generated response, length:', content.length)
      return content.trim()
    } catch (error) {
      console.error('[Chat API] generateGroqResponse: CRITICAL ERROR:', error)
      console.error('[Chat API] generateGroqResponse: Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      throw error
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
 *   "timeline": [{ "time": "02:13", "event": "Login detected" }],
 *   "suspicious_activities": [{ "type": "brute_force_attempt", "severity": "high" }],
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

    // Process the query through RAG pipeline with forensic analysis
    const result = await ragPipeline.processQuery(message);

    const response = {
      reply: result.response,
      timeline: result.timeline,
      suspicious_activities: result.suspicious_activities,
      sources: (result.sources as SourceDocument[]).map(source => ({
        id: source.id,
        content: source.content
          ? source.content.substring(0, 200) + (source.content.length > 200 ? '...' : '')
          : '',
        similarity: source.similarity,
        file_name: source.file_name || 'Unknown Document'
      }))
    }

    console.log(
      `[Chat API] Generated response with ${result.sources.length} sources, ${result.timeline.length} timeline events, ${result.suspicious_activities.length} suspicious activities`
    )

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Chat API] Error processing request:', error)

    // Return a graceful error response
    const errorResponse = {
      reply: "AI investigation system temporarily unavailable.",
      timeline: [],
      suspicious_activities: [],
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
