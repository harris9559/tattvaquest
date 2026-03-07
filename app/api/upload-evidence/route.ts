/**
 * Evidence Upload API for TattvaQuest eDiscovery
 * Handles multipart file uploads for digital evidence
 * Supports PDF, TXT, LOG, and EML files
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { supabase } from '@/backend/database/supabase_client';
import { fileParser } from '@/backend/ingestion/file_parser';
import { documentChunker } from '@/backend/ingestion/chunker';
import { embedder } from '@/backend/ai/embedder';

// Security configuration
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'text/plain',
  'text/log',
  'application/x-log',
  'message/rfc822'
];

const ALLOWED_EXTENSIONS = ['.pdf', '.txt', '.log', '.eml'];

export async function POST(request: NextRequest) {
  console.log('[UploadEvidence] Starting evidence upload process...');

  try {
    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const category = formData.get('category') as string || 'Uncategorized';
    const source = formData.get('source') as string || 'User Upload';

    // Validate file presence
    if (!file) {
      console.error('[UploadEvidence] No file provided');
      return NextResponse.json(
        { error: 'No file provided', details: 'Please select a file to upload' },
        { status: 400 }
      );
    }

    console.log(`[UploadEvidence] File received: ${file.name} (${file.type}, ${file.size} bytes)`);

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      console.error(`[UploadEvidence] File too large: ${file.size} bytes`);
      return NextResponse.json(
        { error: 'File too large', details: 'Maximum file size is 10MB' },
        { status: 413 }
      );
    }

    if (file.size === 0) {
      console.error('[UploadEvidence] Empty file');
      return NextResponse.json(
        { error: 'Empty file', details: 'The uploaded file is empty' },
        { status: 400 }
      );
    }

    // Validate MIME type
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!ALLOWED_MIME_TYPES.includes(file.type) && !ALLOWED_EXTENSIONS.includes(fileExtension)) {
      console.error(`[UploadEvidence] Invalid file type: ${file.type}, extension: ${fileExtension}`);
      return NextResponse.json(
        { 
          error: 'Invalid file type', 
          details: `Supported formats: PDF, TXT, LOG, EML. Received: ${file.type || fileExtension}` 
        },
        { status: 415 }
      );
    }

    // Create temporary directory for processing
    const tempDir = join(process.cwd(), 'tmp', 'uploads');
    await mkdir(tempDir, { recursive: true });

    // Save file to temp location
    const tempFilePath = join(tempDir, `${Date.now()}-${file.name}`);
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(tempFilePath, fileBuffer);

    console.log(`[UploadEvidence] File saved to: ${tempFilePath}`);

    // Parse file and extract content
    let parsedDocument;
    try {
      parsedDocument = await fileParser.parseFile(tempFilePath, file.name, file.type);
      console.log(`[UploadEvidence] File parsed successfully: ${parsedDocument.title}`);
    } catch (parseError) {
      console.error('[UploadEvidence] File parsing error:', parseError);
      return NextResponse.json(
        { 
          error: 'File parsing failed', 
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error' 
        },
        { status: 422 }
      );
    }

    // Insert document metadata into Supabase
    console.log('[UploadEvidence] Storing document metadata...');
    const { data: documentData, error: documentError } = await supabase
      .from('documents')
      .insert({
        title: parsedDocument.title,
        source: source,
        category: category,
        file_name: file.name,
        file_type: file.type || fileExtension,
      })
      .select()
      .single();

    if (documentError) {
      console.error('[UploadEvidence] Database error inserting document:', documentError);
      return NextResponse.json(
        { error: 'Database error', details: documentError.message },
        { status: 500 }
      );
    }

    const documentId = documentData.id;
    console.log(`[UploadEvidence] Document stored with ID: ${documentId}`);

    // Chunk the document content
    console.log('[UploadEvidence] Chunking document content...');
    const chunks = documentChunker.chunkText(parsedDocument.content);
    const chunkStats = documentChunker.getChunkStats(chunks);
    console.log('[UploadEvidence] Chunking complete:', chunkStats);

    if (chunks.length === 0) {
      console.warn('[UploadEvidence] No chunks generated from document');
      return NextResponse.json(
        { 
          error: 'No content extracted', 
          details: 'The file appears to be empty or content could not be extracted' 
        },
        { status: 422 }
      );
    }

    // Generate embeddings for chunks
    console.log('[UploadEvidence] Generating embeddings for chunks...');
    const chunkTexts = chunks.map(c => c.content);
    const embeddings = await embedder.generateEmbeddings(chunkTexts);

    // Prepare chunk data for insertion
    const chunkInserts = chunks.map((chunk, index) => ({
      document_id: documentId,
      chunk_index: chunk.chunk_index,
      content: chunk.content,
      embedding: embeddings[index],
      metadata: {
        token_count: chunk.token_count,
        start_char: chunk.start_char,
        end_char: chunk.end_char
      }
    }));

    // Insert chunks into database
    console.log(`[UploadEvidence] Storing ${chunkInserts.length} chunks...`);
    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkInserts);

    if (chunksError) {
      console.error('[UploadEvidence] Database error inserting chunks:', chunksError);
      return NextResponse.json(
        { error: 'Database error', details: chunksError.message },
        { status: 500 }
      );
    }

    // Log success
    console.log('[UploadEvidence] Evidence upload complete:', {
      documentId,
      fileName: file.name,
      chunksCreated: chunks.length,
      totalTokens: chunkStats.total_tokens
    });

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Evidence uploaded and processed successfully',
      data: {
        document_id: documentId,
        title: parsedDocument.title,
        file_name: file.name,
        file_type: file.type || fileExtension,
        category: category,
        source: source,
        chunks_created: chunks.length,
        total_tokens: chunkStats.total_tokens,
        metadata: parsedDocument.metadata
      }
    }, { status: 201 });

  } catch (error) {
    console.error('[UploadEvidence] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'An unexpected error occurred' 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      endpoint: '/api/upload-evidence',
      method: 'POST',
      description: 'Upload digital evidence files (PDF, TXT, LOG, EML)',
      max_file_size: '10MB',
      supported_formats: ['PDF', 'TXT', 'LOG', 'EML'],
      parameters: {
        file: 'Required - The evidence file to upload',
        category: 'Optional - Document category (default: Uncategorized)',
        source: 'Optional - Evidence source (default: User Upload)'
      }
    },
    { status: 200 }
  );
}
