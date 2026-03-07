/**
 * File Parser Module for TattvaQuest eDiscovery
 * Extracts text content from digital evidence files
 * Supports PDF, TXT, LOG, and EML formats
 */

import * as fs from 'fs';
import * as path from 'path';

// We'll use dynamic imports for these to avoid initial load issues
let pdfParse: any;
let simpleParser: any;

// Lazy load dependencies
async function loadDependencies() {
  if (!pdfParse) {
    try {
      pdfParse = (await import('pdf-parse')).default;
    } catch (error) {
      console.warn('[FileParser] pdf-parse not available, will use fallback');
    }
  }
  if (!simpleParser) {
    try {
      const mailparser = await import('mailparser');
      simpleParser = mailparser.simpleParser;
    } catch (error) {
      console.warn('[FileParser] mailparser not available, will use fallback for EML');
    }
  }
}

export interface ParsedDocument {
  title: string;
  content: string;
  metadata: {
    fileType: string;
    fileName: string;
    fileSize: number;
    pageCount?: number;
    author?: string;
    subject?: string;
    creationDate?: string;
    emailFrom?: string;
    emailTo?: string[];
    emailSubject?: string;
    emailDate?: string;
    attachments?: string[];
  };
}

export class FileParser {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Main entry point: parse any supported file type
   */
  async parseFile(filePath: string, fileName: string, mimeType: string): Promise<ParsedDocument> {
    console.log(`[FileParser] Starting parse: ${fileName} (${mimeType})`);
    
    // Load dependencies on first use
    await loadDependencies();
    
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > this.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 10MB limit: ${stats.size} bytes`);
    }

    // Route to appropriate parser based on MIME type
    switch (mimeType) {
      case 'application/pdf':
        return this.parsePDF(filePath, fileName, stats.size);
      
      case 'text/plain':
        return this.parseText(filePath, fileName, stats.size);
      
      case 'text/log':
      case 'application/x-log':
        return this.parseLog(filePath, fileName, stats.size);
      
      case 'message/rfc822':
        return this.parseEML(filePath, fileName, stats.size);
      
      default:
        // Try to infer from extension
        const ext = path.extname(fileName).toLowerCase();
        if (ext === '.pdf') return this.parsePDF(filePath, fileName, stats.size);
        if (ext === '.txt') return this.parseText(filePath, fileName, stats.size);
        if (ext === '.log') return this.parseLog(filePath, fileName, stats.size);
        if (ext === '.eml') return this.parseEML(filePath, fileName, stats.size);
        
        throw new Error(`Unsupported file type: ${mimeType} (${fileName})`);
    }
  }

  /**
   * Parse PDF files
   */
  private async parsePDF(filePath: string, fileName: string, fileSize: number): Promise<ParsedDocument> {
    console.log('[FileParser] Parsing PDF:', fileName);
    
    try {
      const dataBuffer = fs.readFileSync(filePath);
      
      if (!pdfParse) {
        // Fallback: return file info without content extraction
        return {
          title: path.basename(fileName, '.pdf'),
          content: `[PDF file: ${fileName}] Content extraction not available. File size: ${fileSize} bytes.`,
          metadata: {
            fileType: 'application/pdf',
            fileName,
            fileSize
          }
        };
      }

      const pdfData = await pdfParse(dataBuffer);
      
      return {
        title: pdfData.info?.Title || path.basename(fileName, '.pdf'),
        content: pdfData.text || '',
        metadata: {
          fileType: 'application/pdf',
          fileName,
          fileSize,
          pageCount: pdfData.numpages,
          author: pdfData.info?.Author,
          subject: pdfData.info?.Subject,
          creationDate: pdfData.info?.CreationDate
        }
      };
    } catch (error) {
      console.error('[FileParser] PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse plain text files
   */
  private parseText(filePath: string, fileName: string, fileSize: number): ParsedDocument {
    console.log('[FileParser] Parsing text file:', fileName);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Try to extract title from first line
      const lines = content.split('\n');
      const title = lines[0]?.trim().substring(0, 100) || path.basename(fileName, '.txt');
      
      return {
        title,
        content,
        metadata: {
          fileType: 'text/plain',
          fileName,
          fileSize,
          pageCount: lines.length
        }
      };
    } catch (error) {
      console.error('[FileParser] Text parsing error:', error);
      throw new Error(`Failed to parse text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse log files (treated as text with log-specific metadata)
   */
  private parseLog(filePath: string, fileName: string, fileSize: number): ParsedDocument {
    console.log('[FileParser] Parsing log file:', fileName);
    
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      
      // Extract potential timestamps and log levels for metadata
      const timestamps: string[] = [];
      const logLevels = new Set<string>();
      
      lines.slice(0, 100).forEach(line => {
        // Common timestamp patterns
        const timestampMatch = line.match(/\d{4}[-/]\d{2}[-/]\d{2}|\d{2}:\d{2}:\d{2}/);
        if (timestampMatch) timestamps.push(timestampMatch[0]);
        
        // Common log levels
        const levelMatch = line.match(/\b(ERROR|WARN|WARNING|INFO|DEBUG|TRACE|FATAL)\b/i);
        if (levelMatch) logLevels.add(levelMatch[1].toUpperCase());
      });
      
      return {
        title: path.basename(fileName, '.log'),
        content,
        metadata: {
          fileType: 'text/log',
          fileName,
          fileSize,
          pageCount: lines.length,
          creationDate: timestamps[0],
          author: Array.from(logLevels).join(', ') // Store log levels as 'author' metadata
        }
      };
    } catch (error) {
      console.error('[FileParser] Log parsing error:', error);
      throw new Error(`Failed to parse log file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse EML (email) files
   */
  private async parseEML(filePath: string, fileName: string, fileSize: number): Promise<ParsedDocument> {
    console.log('[FileParser] Parsing EML file:', fileName);
    
    try {
      const dataBuffer = fs.readFileSync(filePath);
      
      if (!simpleParser) {
        // Fallback: treat as text
        const content = dataBuffer.toString('utf-8');
        return {
          title: path.basename(fileName, '.eml'),
          content,
          metadata: {
            fileType: 'message/rfc822',
            fileName,
            fileSize
          }
        };
      }

      const parsed = await simpleParser(dataBuffer);
      
      // Extract email content
      let content = '';
      if (typeof parsed.text === 'string') {
        content = parsed.text;
      } else if (parsed.html && typeof parsed.html === 'string') {
        // Simple HTML to text conversion
        content = this.htmlToText(parsed.html);
      }

      // Extract attachments info
      const attachments = parsed.attachments?.map((att: any) => att.filename || 'unnamed').filter(Boolean) || [];
      
      return {
        title: parsed.subject || path.basename(fileName, '.eml'),
        content,
        metadata: {
          fileType: 'message/rfc822',
          fileName,
          fileSize,
          emailFrom: parsed.from?.text || parsed.from?.value?.[0]?.address,
          emailTo: parsed.to?.map((addr: any) => addr.text || addr.address) || [],
          emailSubject: parsed.subject,
          emailDate: parsed.date?.toISOString(),
          attachments: attachments.length > 0 ? attachments : undefined
        }
      };
    } catch (error) {
      console.error('[FileParser] EML parsing error:', error);
      throw new Error(`Failed to parse EML file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Simple HTML to text conversion
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate MIME type is supported
   */
  isSupportedMimeType(mimeType: string, fileName: string): boolean {
    const supported = [
      'application/pdf',
      'text/plain',
      'text/log',
      'application/x-log',
      'message/rfc822'
    ];
    
    if (supported.includes(mimeType)) return true;
    
    // Check by extension
    const ext = path.extname(fileName).toLowerCase();
    const supportedExts = ['.pdf', '.txt', '.log', '.eml'];
    
    return supportedExts.includes(ext);
  }
}

// Export singleton instance
export const fileParser = new FileParser();
