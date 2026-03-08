/**
 * Next.js API Route for Document Upload and Ingestion
 * Handles PDF, TXT, and investigation log uploads
 * Integrates with NLP pipeline and embedding generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/backend/database/supabase_client';

// Allowed file types and their MIME types
const ALLOWED_FILE_TYPES = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json'
};

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Extract text from PDF file
 * Note: In production, this would use a PDF parsing library
 */
async function extractTextFromPDF(buffer: ArrayBuffer): Promise<string> {
  // TODO: Implement PDF text extraction
  // For now, return a placeholder
  return "PDF content extraction not implemented. Please use text files for now.";
}

/**
 * Extract text from plain text file
 */
async function extractTextFromTXT(buffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

/**
 * Extract text from CSV file
 */
async function extractTextFromCSV(buffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder('utf-8');
  return decoder.decode(buffer);
}

/**
 * Extract text from JSON file (investigation logs)
 */
async function extractTextFromJSON(buffer: ArrayBuffer): Promise<string> {
  const decoder = new TextDecoder('utf-8');
  const jsonString = decoder.decode(buffer);
  
  try {
    const jsonData = JSON.parse(jsonString);
    // Convert JSON to readable text format
    return JSON.stringify(jsonData, null, 2);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Call Python service for entity extraction
 * Note: In production, this would call the Python NLP service
 */
async function extractEntities(text: string): Promise<Array<{entity: string, entity_type: string}>> {
  // TODO: Implement Python service call
  // For now, return basic regex-based extraction
  
  const entities: Array<{entity: string, entity_type: string}> = [];
  
  // Email extraction
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex) || [];
  emails.forEach(email => {
    entities.push({ entity: email, entity_type: 'EMAIL' });
  });
  
  // Phone number extraction
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const phones = text.match(phoneRegex) || [];
  phones.forEach(phone => {
    entities.push({ entity: phone, entity_type: 'PHONE' });
  });
  
  return entities;
}

/**
 * Call Python service for embedding generation
 * Note: In production, this would call the Python embedding service
 */
async function generateEmbeddings(textChunks: string[]): Promise<number[][]> {
  // TODO: Implement Python service call
  // For now, return mock embeddings
  
  return textChunks.map(() => 
    Array(384).fill(0).map(() => Math.random() - 0.5)
  );
}

/**
 * Split text into chunks for embedding
 */
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 100): string[] {
  const chunks = [];
  
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    const chunk = text.substring(i, i + chunkSize);
    if (chunk.trim().length > 0) {
      chunks.push(chunk);
    }
  }
  
  return chunks;
}

/**
 * POST /api/upload
 * 
 * Request: FormData with file
 * 
 * Response:
 * {
 *   "success": true,
 *   "document_id": "uuid",
 *   "chunks_processed": 5,
 *   "entities_extracted": 12,
 *   "message": "Document processed successfully"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    // Validate file
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Check file type
    const mimeType = file.type;
    const fileType = ALLOWED_FILE_TYPES[mimeType as keyof typeof ALLOWED_FILE_TYPES];
    
    if (!fileType) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mimeType}. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}` },
        { status: 400 }
      );
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }
    
    console.log(`[Upload API] Processing file: ${file.name} (${fileType})`);
    
    // Read file content
    const buffer = await file.arrayBuffer();
    
    // Extract text based on file type
    let text: string;
    try {
      switch (fileType) {
        case 'pdf':
          text = await extractTextFromPDF(buffer);
          break;
        case 'txt':
          text = await extractTextFromTXT(buffer);
          break;
        case 'csv':
          text = await extractTextFromCSV(buffer);
          break;
        case 'json':
          text = await extractTextFromJSON(buffer);
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error('[Upload API] Text extraction error:', error);
      return NextResponse.json(
        { error: `Failed to extract text from ${fileType} file` },
        { status: 500 }
      );
    }
    
    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text content found in file' },
        { status: 400 }
      );
    }
    
    // Extract entities
    let entities: Array<{entity: string, entity_type: string}> = [];
    try {
      entities = await extractEntities(text);
      console.log(`[Upload API] Extracted ${entities.length} entities`);
    } catch (error) {
      console.error('[Upload API] Entity extraction error:', error);
      // Continue without entities
    }
    
    // Split text into chunks
    const textChunks = chunkText(text);
    console.log(`[Upload API] Split text into ${textChunks.length} chunks`);
    
    // Generate embeddings for chunks
    let embeddings = [];
    try {
      embeddings = await generateEmbeddings(textChunks);
      console.log(`[Upload API] Generated ${embeddings.length} embeddings`);
    } catch (error) {
      console.error('[Upload API] Embedding generation error:', error);
      return NextResponse.json(
        { error: 'Failed to generate embeddings' },
        { status: 500 }
      );
    }
    
    // Store document chunks in database
    const documentIds = [];
    
    try {
      for (let i = 0; i < textChunks.length; i++) {
        const chunk = textChunks[i];
        const embedding = embeddings[i];
        
        const { data, error } = await supabase
          .from('documents')
          .insert({
            content: chunk,
            embedding: embedding,
            file_name: file.name,
            file_type: fileType
          })
          .select('id')
          .single();
        
        if (error) {
          console.error('[Upload API] Database insertion error:', error);
          throw error;
        }
        
        documentIds.push(data.id);
      }
      
      console.log(`[Upload API] Stored ${documentIds.length} document chunks`);
    } catch (error) {
      console.error('[Upload API] Database storage error:', error);
      return NextResponse.json(
        { error: 'Failed to store document in database' },
        { status: 500 }
      );
    }
    
    // Store entities
    let storedEntities = 0;
    try {
      for (const entity of entities) {
        // Store entity for each document chunk (simplified approach)
        for (const documentId of documentIds) {
          await supabase
            .from('entities')
            .insert({
              document_id: documentId,
              entity: entity.entity,
              entity_type: entity.entity_type
            });
        }
        storedEntities++;
      }
      
      console.log(`[Upload API] Stored ${storedEntities} entities`);
    } catch (error) {
      console.error('[Upload API] Entity storage error:', error);
      // Continue without failing the request
    }
    
    // Return success response
    const response = {
      success: true,
      document_id: documentIds[0], // Return first chunk ID as reference
      chunks_processed: textChunks.length,
      entities_extracted: storedEntities,
      message: `Document "${file.name}" processed successfully`
    };
    
    console.log(`[Upload API] Upload completed:`, response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('[Upload API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error during file upload' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload
 * 
 * Get list of uploaded documents
 * 
 * Response:
 * {
 *   "documents": [
 *     {
 *       "id": "uuid",
 *       "file_name": "document.pdf",
 *       "file_type": "pdf",
 *       "created_at": "2024-03-07T18:00:00Z"
 *     }
 *   ]
 * }
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id, file_name, file_type, created_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[Upload API] Error fetching documents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ documents: data || [] });
    
  } catch (error) {
    console.error('[Upload API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
