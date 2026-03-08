/**
 * Standalone API handler for document upload
 * Can be used with Express.js if needed
 */

import { supabase } from '@/backend/database/supabase_client';

// Allowed file types
const ALLOWED_FILE_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'application/json': 'json'
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Express.js handler for POST /api/upload
 */
export async function handleUploadRequest(req: any, res: any) {
  try {
    // Handle multipart form data
    if (!req.files || !req.files.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const file = req.files.file;
    const mimeType = file.mimetype;
    const fileType = ALLOWED_FILE_TYPES[mimeType];

    if (!fileType) {
      return res.status(400).json({
        error: `Unsupported file type: ${mimeType}`
      });
    }

    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }

    console.log(`[Upload Handler] Processing file: ${file.name} (${fileType})`);

    // Extract text (placeholder implementations)
    let text: string;
    switch (fileType) {
      case 'txt':
        text = file.data.toString('utf-8');
        break;
      case 'json':
        try {
          const jsonData = JSON.parse(file.data.toString('utf-8'));
          text = JSON.stringify(jsonData, null, 2);
        } catch (error) {
          return res.status(400).json({ error: 'Invalid JSON format' });
        }
        break;
      default:
        text = file.data.toString('utf-8');
    }

    if (!text.trim()) {
      return res.status(400).json({ error: 'No text content found' });
    }

    // Basic entity extraction (placeholder)
    const entities = extractBasicEntities(text);

    // Split into chunks
    const chunks = chunkText(text);

    // Mock embeddings (replace with real implementation)
    const embeddings = chunks.map(() => Array(384).fill(0).map(() => Math.random() - 0.5));

    // Store in database
    const documentIds = [];
    for (let i = 0; i < chunks.length; i++) {
      const { data, error } = await supabase
        .from('documents')
        .insert({
          content: chunks[i],
          embedding: embeddings[i],
          file_name: file.name,
          file_type: fileType
        })
        .select('id')
        .single();

      if (error) throw error;
      documentIds.push(data.id);
    }

    // Store entities
    for (const entity of entities) {
      for (const docId of documentIds) {
        await supabase
          .from('entities')
          .insert({
            document_id: docId,
            entity: entity.text,
            entity_type: entity.type
          });
      }
    }

    const response = {
      success: true,
      document_id: documentIds[0],
      chunks_processed: chunks.length,
      entities_extracted: entities.length,
      message: `Document "${file.name}" processed successfully`
    };

    res.json(response);

  } catch (error) {
    console.error('[Upload Handler] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Express.js handler for GET /api/upload
 */
export async function handleListDocuments(req: any, res: any) {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('id, file_name, file_type, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ documents: data || [] });

  } catch (error) {
    console.error('[Upload Handler] List error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
}

/**
 * Basic entity extraction using regex
 */
function extractBasicEntities(text: string): Array<{text: string, type: string}> {
  const entities: Array<{text: string, type: string}> = [];
  
  // Emails
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  const emails = text.match(emailRegex) || [];
  emails.forEach(email => entities.push({ text: email, type: 'EMAIL' }));
  
  // Phone numbers
  const phoneRegex = /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g;
  const phones = text.match(phoneRegex) || [];
  phones.forEach(phone => entities.push({ text: phone, type: 'PHONE' }));
  
  return entities;
}

/**
 * Split text into chunks
 */
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 100): string[] {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    const chunk = text.substring(i, i + chunkSize);
    if (chunk.trim()) chunks.push(chunk);
  }
  return chunks;
}
