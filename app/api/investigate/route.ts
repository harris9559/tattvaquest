/**
 * Evidence Investigation API for TattvaQuest eDiscovery
 * Allows investigators to query uploaded evidence using AI analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { hybridRetrieval } from '@/backend/ai/hybrid_retrieval';
import { embedder } from '@/backend/ai/embedder';
import { supabase } from '@/backend/database/supabase_client';

// Groq API configuration
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'llama-3.1-8b-instant'; // Current Groq model

export interface InvestigationRequest {
  question: string;
  category_filter?: string;
  source_filter?: string;
  max_chunks?: number;
}

export interface InvestigationResponse {
  reply: string;
  sources: string[];
  evidence_chunks_used: number;
  retrieval_method: 'hybrid' | 'vector' | 'keyword' | 'general_knowledge';
  relevant_documents: Array<{
    id: string;
    title: string;
    file_name: string;
    category: string;
    similarity: number;
  }>;
}

export async function POST(request: NextRequest) {
  console.log('[Investigate] Starting evidence investigation...');

  try {
    // Parse request body
    const body: InvestigationRequest = await request.json();
    const { 
      question, 
      category_filter, 
      source_filter,
      max_chunks = 5 
    } = body;

    // Validate question
    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: 'Question is required', details: 'Please provide an investigation question' },
        { status: 400 }
      );
    }

    console.log(`[Investigate] Question: ${question}`);
    console.log(`[Investigate] Filters - Category: ${category_filter}, Source: ${source_filter}`);

    // Step 1: Generate embedding for the question
    console.log('[Investigate] Generating question embedding...');
    const questionEmbedding = await embedder.generateEmbedding(question);

    // Step 2: Retrieve relevant evidence chunks (search ALL documents by default)
    console.log('[Investigate] Retrieving relevant evidence...');
    let relevantChunks = await hybridRetrieval.hybridSearch({
      query: question,
      embedding: questionEmbedding,
      limit: max_chunks,
      // Only pass filters if explicitly provided and meaningful
      ...(category_filter && category_filter !== 'Uncategorized' ? { categoryFilter: category_filter } : {}),
      ...(source_filter && source_filter !== 'User Upload' ? { sourceFilter: source_filter } : {})
    });

    console.log(`[Investigate] Retrieved ${relevantChunks.length} relevant chunks`);
    
    // Log each chunk found
    relevantChunks.forEach((chunk, i) => {
      console.log(`[Investigate] Chunk ${i + 1}: ${chunk.file_name} (similarity: ${chunk.similarity.toFixed(3)})`);
    });

    // Step 3: Prepare context from retrieved evidence
    const hasEvidence = relevantChunks.length > 0;
    
    // Build context text from chunks
    const evidenceContext = relevantChunks.map((chunk, index) => {
      return `[Evidence ${index + 1}]:
Source: ${chunk.file_name || chunk.title || 'Unknown'}
Category: ${chunk.category || 'Uncategorized'}
Content: ${chunk.content.substring(0, 1000)}${chunk.content.length > 1000 ? '...' : ''}
`;
    }).join('\n---\n');

    console.log('[Investigate] Evidence context built, length:', evidenceContext.length);

    // Step 4: Generate AI analysis
    console.log('[Investigate] Generating AI analysis...');
    let analysis: string;
    try {
      analysis = await generateInvestigationAnalysis(question, evidenceContext, hasEvidence);
    } catch (aiError) {
      console.error('[Investigate] AI generation failed:', aiError);
      analysis = `Analysis of the evidence shows the following content:\n\n${evidenceContext}\n\nNote: Full AI analysis unavailable at this time.`;
    }

    // Step 5: Log the investigation
    await logInvestigation(question, analysis, relevantChunks.map(c => c.id));

    // Build response with accurate counts
    const response: InvestigationResponse = {
      reply: analysis,
      sources: [...new Set(relevantChunks.map(c => c.file_name || c.title || 'Unknown').filter(Boolean))],
      evidence_chunks_used: relevantChunks.length,
      retrieval_method: hasEvidence ? 'hybrid' : 'general_knowledge',
      relevant_documents: relevantChunks.map(chunk => ({
        id: chunk.id,
        title: chunk.title || 'Untitled',
        file_name: chunk.file_name || 'Unknown',
        category: chunk.category || 'Uncategorized',
        similarity: chunk.combined_score
      }))
    };

    console.log('[Investigate] Investigation complete - Chunks used:', relevantChunks.length);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('[Investigate] Error:', error);
    return NextResponse.json(
      { 
        error: 'Investigation failed', 
        details: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}

/**
 * Generate AI investigation analysis using Groq
 */
async function generateInvestigationAnalysis(
  question: string, 
  evidenceContext: string, 
  hasEvidence: boolean
): Promise<string> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY not configured');
  }

  const systemPrompt = `You are an AI digital forensics assistant for TattvaQuest.

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
          content: question
        }
      ],
      max_tokens: 2000,
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Investigate] Groq API error response:', errorText);
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  const analysis = data.choices?.[0]?.message?.content;

  if (!analysis) {
    throw new Error('No analysis generated from AI');
  }

  return analysis.trim();
}

/**
 * Log investigation for audit trail
 */
async function logInvestigation(question: string, response: string, chunkIds: string[]): Promise<void> {
  try {
    await supabase
      .from('investigation_logs')
      .insert({
        question,
        response_preview: response.substring(0, 500),
        evidence_chunks_used: chunkIds,
        created_at: new Date().toISOString()
      });
    
    console.log('[Investigate] Investigation logged');
  } catch (error) {
    console.error('[Investigate] Failed to log investigation:', error);
    // Non-critical error, don't throw
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      endpoint: '/api/investigate',
      method: 'POST',
      description: 'Query uploaded evidence using AI investigation',
      parameters: {
        question: 'Required - The investigation question to answer',
        category_filter: 'Optional - Filter by document category',
        source_filter: 'Optional - Filter by evidence source',
        max_chunks: 'Optional - Maximum evidence chunks to retrieve (default: 5)'
      },
      example_response: {
        reply: 'Analysis of the evidence shows...',
        sources: ['email_1.eml', 'server_log.txt'],
        evidence_chunks_used: 4,
        retrieval_method: 'hybrid',
        relevant_documents: [
          {
            id: 'uuid',
            title: 'Suspicious Email',
            file_name: 'email_1.eml',
            category: 'Email Evidence',
            similarity: 0.85
          }
        ]
      }
    },
    { status: 200 }
  );
}
