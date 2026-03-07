/**
 * Standalone API handler for forensic log analysis
 * Can be used with Express.js if needed
 */

interface LogAnalysisRequest {
  log_content: string;
  log_type?: string;
  time_range?: string;
}

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
  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }

  const systemPrompt = `You are an expert digital forensics and cybersecurity analyst.

Analyze the provided log content and provide a comprehensive forensic analysis in JSON format:

{
  "incident_summary": "Brief overview of what happened",
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

Log Content:
${logContent}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Analyze this log content.' }
        ],
        max_tokens: 2000,
        temperature: 0.2,
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No response from Groq API');
    }

    return JSON.parse(analysisText);

  } catch (error) {
    console.error('Error generating log analysis:', error);
    
    // Return fallback analysis
    return {
      incident_summary: 'Unable to analyze logs due to technical issues.',
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
          recommendation: 'Ensure logs are properly formatted',
          urgency: 'immediate' as const
        }
      ]
    };
  }
}

/**
 * Express.js handler for POST /api/analyze-log
 */
export async function handleLogAnalysisRequest(req: any, res: any) {
  try {
    const { log_content, log_type = 'custom', time_range = 'custom' }: LogAnalysisRequest = req.body;

    if (!log_content || typeof log_content !== 'string') {
      return res.status(400).json({ error: 'Log content is required and must be a string' });
    }

    if (log_content.trim().length === 0) {
      return res.status(400).json({ error: 'Log content cannot be empty' });
    }

    if (log_content.length > 50000) {
      return res.status(400).json({ error: 'Log content is too long (max 50,000 characters)' });
    }

    console.log(`[Analyze Log Handler] Processing ${log_content.length} characters`);

    const startTime = Date.now();
    const analysis = await generateLogAnalysis(log_content);
    const processingTime = Date.now() - startTime;

    const metadata = {
      log_lines_processed: log_content.split('\n').length,
      analysis_time: new Date().toISOString(),
      processing_time_ms: processingTime,
      confidence_score: Math.min(0.95, 0.5 + (log_content.split('\n').length / 1000)),
      log_type,
      time_range
    };

    res.json({
      analysis,
      metadata
    });

  } catch (error) {
    console.error('[Analyze Log Handler] Error:', error);
    res.status(500).json({ 
      error: 'Internal server error during log analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Express.js handler for GET /api/analyze-log
 */
export async function handleAnalysisInfo(req: any, res: any) {
  try {
    const info = {
      supported_log_types: ['syslog', 'windows', 'apache', 'nginx', 'custom', 'json'],
      max_log_size: 50000,
      analysis_capabilities: [
        'Incident summary generation',
        'Suspicious activity detection',
        'Timeline reconstruction',
        'Investigation step recommendations',
        'Security best practice recommendations'
      ],
      examples: {
        syslog: 'Mar 7 10:15:30 server sshd[1234]: Failed password for root from 192.168.1.100',
        windows: '2024-03-07 10:15:30, Security, 4625, An account failed to log on',
        apache: '192.168.1.100 - - [07/Mar/2024:10:15:30 +0000] "GET /admin HTTP/1.1" 401 1234'
      }
    };

    res.json(info);

  } catch (error) {
    console.error('[Analyze Log Handler] Info error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
