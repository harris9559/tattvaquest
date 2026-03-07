/**
 * Next.js API Route for Forensic Log Analysis
 * Uses LLaMA3 via Groq to analyze investigation logs
 * Provides incident summaries, suspicious activity detection, and investigation recommendations
 */

import { NextRequest, NextResponse } from 'next/server';

// Environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL_NAME = 'llama3-8b-8192';

interface LogAnalysis {
  incident_summary: string;
  suspicious_activities: Array<{
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
  }>;
  investigation_steps: Array<{
    step: number;
    action: string;
    priority: 'immediate' | 'high' | 'medium' | 'low';
  }>;
  timeline: Array<{
    timestamp: string;
    event: string;
    significance: string;
  }>;
  recommendations: Array<{
    category: string;
    recommendation: string;
    urgency: 'immediate' | 'short-term' | 'long-term';
  }>;
}

/**
 * Generate AI analysis using Groq LLaMA3
 */
async function generateLogAnalysis(logContent: string): Promise<LogAnalysis> {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  const systemPrompt = `You are an expert digital forensics and cybersecurity analyst with 15+ years of experience in incident response and log analysis.

Analyze the provided log content and provide a comprehensive forensic analysis in the following JSON format:

{
  "incident_summary": "Brief overview of what happened in the logs",
  "suspicious_activities": [
    {
      "type": "activity_type",
      "description": "detailed description",
      "severity": "low|medium|high|critical",
      "confidence": 0.85
    }
  ],
  "investigation_steps": [
    {
      "step": 1,
      "action": "specific investigation action",
      "priority": "immediate|high|medium|low"
    }
  ],
  "timeline": [
    {
      "timestamp": "YYYY-MM-DD HH:MM:SS",
      "event": "what happened",
      "significance": "why it matters"
    }
  ],
  "recommendations": [
    {
      "category": "security|process|technical",
      "recommendation": "specific recommendation",
      "urgency": "immediate|short-term|long-term"
    }
  ]
}

Analysis Guidelines:
1. Focus on security incidents, unauthorized access, data exfiltration, malware, and policy violations
2. Identify patterns, anomalies, and indicators of compromise
3. Prioritize findings by severity and business impact
4. Provide actionable investigation steps
5. Consider both technical and procedural recommendations
6. Be thorough but concise
7. If logs are insufficient, clearly state limitations

Log Content:
${logContent}`;

  try {
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
            content: 'Please analyze this log content and provide a structured forensic analysis in the requested JSON format.'
          }
        ],
        max_tokens: 2000,
        temperature: 0.2, // Low temperature for consistent analysis
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No response from Groq API');
    }

    // Parse JSON response
    const analysis: LogAnalysis = JSON.parse(analysisText);
    return analysis;

  } catch (error) {
    console.error('Error generating log analysis:', error);
    
    // Return fallback analysis
    return {
      incident_summary: 'Unable to analyze logs due to technical issues. Please check log format and try again.',
      suspicious_activities: [],
      investigation_steps: [
        {
          step: 1,
          action: 'Verify log integrity and format',
          priority: 'immediate' as const
        }
      ],
      timeline: [],
      recommendations: [
        {
          category: 'technical',
          recommendation: 'Ensure logs are properly formatted and contain relevant security events',
          urgency: 'immediate' as const
        }
      ]
    };
  }
}

/**
 * POST /api/analyze-log
 * 
 * Request body:
 * {
 *   "log_content": "raw log content or JSON string",
 *   "log_type": "syslog|windows|apache|nginx|custom", // optional
 *   "time_range": "24h|7d|30d|custom" // optional
 * }
 * 
 * Response:
 * {
 *   "analysis": {
 *     "incident_summary": "...",
 *     "suspicious_activities": [...],
 *     "investigation_steps": [...],
 *     "timeline": [...],
 *     "recommendations": [...]
 *   },
 *   "metadata": {
 *     "log_lines_processed": 150,
 *     "analysis_time": "2024-03-07T18:00:00Z",
 *     "confidence_score": 0.85
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { log_content, log_type = 'custom', time_range = 'custom' } = body;

    // Validate input
    if (!log_content || typeof log_content !== 'string') {
      return NextResponse.json(
        { error: 'Log content is required and must be a string' },
        { status: 400 }
      );
    }

    if (log_content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Log content cannot be empty' },
        { status: 400 }
      );
    }

    if (log_content.length > 50000) {
      return NextResponse.json(
        { error: 'Log content is too long (max 50,000 characters)' },
        { status: 400 }
      );
    }

    console.log(`[Analyze Log API] Processing ${log_content.length} characters of log data`);

    const startTime = Date.now();

    // Generate analysis
    const analysis = await generateLogAnalysis(log_content);

    const analysisTime = Date.now() - startTime;

    // Calculate metadata
    const logLines = log_content.split('\n').length;
    const confidenceScore = Math.min(0.95, 0.5 + (logLines / 1000)); // Simple confidence calculation

    const metadata = {
      log_lines_processed: logLines,
      analysis_time: new Date().toISOString(),
      processing_time_ms: analysisTime,
      confidence_score: confidenceScore,
      log_type,
      time_range
    };

    console.log(`[Analyze Log API] Analysis completed in ${analysisTime}ms`);

    return NextResponse.json({
      analysis,
      metadata
    });

  } catch (error) {
    console.error('[Analyze Log API] Error processing request:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error during log analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/analyze-log
 * 
 * Get information about supported log types and analysis capabilities
 * 
 * Response:
 * {
 *   "supported_log_types": ["syslog", "windows", "apache", "nginx", "custom"],
 *   "max_log_size": 50000,
 *   "analysis_capabilities": [...],
 *   "examples": [...]
 * }
 */
export async function GET() {
  try {
    const info = {
      supported_log_types: ['syslog', 'windows', 'apache', 'nginx', 'custom', 'json'],
      max_log_size: 50000,
      analysis_capabilities: [
        'Incident summary generation',
        'Suspicious activity detection',
        'Timeline reconstruction',
        'Investigation step recommendations',
        'Security best practice recommendations',
        'Pattern and anomaly detection'
      ],
      examples: {
        syslog: 'Mar 7 10:15:30 server sshd[1234]: Failed password for root from 192.168.1.100 port 22 ssh2',
        windows: '2024-03-07 10:15:30, Security, 4625, An account failed to log on',
        apache: '192.168.1.100 - - [07/Mar/2024:10:15:30 +0000] "GET /admin HTTP/1.1" 401 1234',
        nginx: '192.168.1.100 - user [07/Mar/2024:10:15:30 +0000] "POST /api/login HTTP/1.1" 200 567'
      },
      best_practices: [
        'Include timestamps in log entries',
        'Provide context and user information',
        'Include source IP addresses',
        'Log both successful and failed events',
        'Maintain consistent log format'
      ]
    };

    return NextResponse.json(info);

  } catch (error) {
    console.error('[Analyze Log API] Error in GET request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
