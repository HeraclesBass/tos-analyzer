/**
 * Gemini AI Service for TOS Analysis
 * 
 * Implements intelligent TOS analysis using Google's Gemini API
 * Features:
 * - Cache-first architecture (Redis)
 * - Content-based deduplication (SHA-256 hashing)
 * - Automatic chunking for large documents
 * - Retry logic with exponential backoff
 * - Cost tracking (token usage)
 * - Comprehensive error handling
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { hashContent, normalizeText, chunkText, sleep, calculateBackoff } from '../utils';
import { getCachedAnalysis, cacheAnalysis } from '../redis';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.5-pro',
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json',
  }
});

// Expected analysis result schema
const AnalysisResultSchema = z.object({
  detected_company: z.object({
    name: z.string(), // e.g., "Google", "Microsoft", "Meta"
    confidence: z.enum(['high', 'medium', 'low']),
    source: z.string(), // Where found: "header", "legal_entity", "self_reference", "domain", "unclear"
  }),
  document_validation: z.object({
    is_legal_document: z.boolean(),
    document_type: z.enum(['tos', 'privacy_policy', 'eula', 'service_agreement', 'cookie_policy', 'unknown', 'not_legal']),
    confidence: z.number(), // 0-100
    rejection_reason: z.string().nullable().optional(), // Only if confidence < 70 or not_legal
  }),
  summary: z.object({
    overall_risk: z.enum(['low', 'medium', 'high']),
    total_clauses: z.number(),
    green_count: z.number(),
    yellow_count: z.number(),
    red_count: z.number(),
    key_takeaways: z.array(z.string()),
  }),
  categories: z.array(z.object({
    name: z.enum(['Privacy', 'Liability', 'Rights', 'Changes', 'Termination', 'Payment', 'AI & Data Use']),
    clauses: z.array(z.object({
      severity: z.enum(['safe', 'concerning', 'critical']),
      original_text: z.string(),
      explanation: z.string(),
      why_this_matters: z.string(),
      quote_reference: z.string(),
    })),
  })),
  metadata: z.object({
    analyzed_at: z.string(),
    word_count: z.number(),
    estimated_read_time: z.string(),
  }).optional(),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;

/**
 * System prompt for TOS analysis
 * Instructs Claude on how to analyze Terms of Service documents
 */
const SYSTEM_PROMPT = `You are an expert legal analyst specializing in Terms of Service (TOS) and privacy policy analysis. Your role is to help users understand complex legal documents by identifying potential risks, unfair clauses, and user rights.

When analyzing TOS documents, you should:

CRITICAL - PERFORM THESE CHECKS FIRST:

0. DOCUMENT VALIDATION & COMPANY DETECTION:
   
   A. Validate this is a legal document:
      - Check for legal language patterns: "agree", "terms", "conditions", "liability", "warranty", "indemnification"
      - Look for document structure: numbered sections, legal clauses, formal tone
      - Check for legal entity references, effective dates, jurisdiction clauses
      - If this appears to be creative writing, a poem, essay, personal content, or non-legal text:
        Set is_legal_document: false, document_type: "not_legal", confidence: 0-30
        Set rejection_reason: "This appears to be [type of content], not a legal document like Terms of Service"
        SKIP THE REST OF THE ANALYSIS - return only validation and company detection
      
   B. Identify document type:
      - "tos" or "service_agreement": Terms of Service, Terms of Use, User Agreement
      - "privacy_policy": Privacy Policy, Data Protection Notice
      - "eula": End User License Agreement
      - "cookie_policy": Cookie Policy, Cookie Notice
      - "unknown": Legal document but unclear type
      - "not_legal": Not a legal document (creative writing, etc.)
   
   C. Extract company name automatically:
      - Look in document headers/titles: "Google Terms of Service", "Meta Privacy Policy"
      - Find self-references: "we, [Company Name], ...", "Company Name, Inc.", "Company Name LLC"
      - Check legal entity names in signatures or footer sections
      - Look for domain references: "google.com", "facebook.com" (extract base company)
      - Use context clues: "your YouTube account", "Instagram users" → extract platform owner
      
      Confidence levels:
      - HIGH: Company name appears 3+ times consistently, or in legal entity signature
      - MEDIUM: Company name found 1-2 times, or inferred from platform/domain
      - LOW: Unclear or conflicting company references
      
      Source examples:
      - "header": Found in document title/header
      - "legal_entity": Found in legal entity name (e.g., "Google LLC")
      - "self_reference": Found in "we, Company Name" statements
      - "domain": Extracted from domain references
      - "unclear": Multiple conflicting names or no clear reference
      
   If is_legal_document: false, STOP HERE. Return only detected_company and document_validation fields with empty arrays for summary and categories.

1. IDENTIFY KEY CONCERNS:
   - Data collection and privacy practices (what data is collected, how it's used, who it's shared with)
   - AI training and content use (whether user content is used to train AI models)
   - Intellectual property and content licensing (who owns user-generated content)
   - User rights and restrictions (what users can/cannot do)
   - Liability limitations and warranty disclaimers
   - Termination clauses (how service can be terminated)
   - Changes to terms (how and when TOS can be modified)
   - Dispute resolution (arbitration clauses, class action waivers)

2. ASSESS RISK LEVELS:
   - CRITICAL: Severe issues that significantly harm user rights or privacy
   - HIGH: Major concerns that most users should be aware of
   - MEDIUM: Notable issues worth considering
   - LOW: Minor concerns or standard clauses

3. PROVIDE BALANCED ANALYSIS:
   - Highlight both concerns AND positive aspects
   - Use direct quotes from the TOS to support your analysis
   - Explain legal concepts in plain language
   - Provide actionable recommendations

4. CALCULATE SCORES (0-100):
   - 0-25: Very poor (highly unfavorable to users)
   - 26-50: Below average (several concerning clauses)
   - 51-75: Average (standard terms with some concerns)
   - 76-100: Good (user-friendly, transparent, fair)

5. OUTPUT FORMAT:
   Return a JSON object matching this EXACT structure. You MUST use ONLY these exact category names: "Privacy", "Liability", "Rights", "Changes", "Termination", "Payment", or "AI & Data Use". Do NOT create new categories.
   
   {
     "detected_company": {
       "name": "Google",
       "confidence": "high",
       "source": "legal_entity"
     },
     "document_validation": {
       "is_legal_document": true,
       "document_type": "tos",
       "confidence": 95,
       "rejection_reason": null
     },
     "summary": {
       "overall_risk": "low" | "medium" | "high",
       "total_clauses": <number>,
       "green_count": <number of safe clauses>,
       "yellow_count": <number of concerning clauses>,
       "red_count": <number of critical clauses>,
       "key_takeaways": ["<key point 1>", "<key point 2>", "<key point 3>"]
     },
     "categories": [
       {
         "name": MUST BE EXACTLY ONE OF: "Privacy", "Liability", "Rights", "Changes", "Termination", "Payment", "AI & Data Use",
         "clauses": [
           {
             "severity": MUST BE EXACTLY ONE OF: "safe", "concerning", "critical",
             "original_text": "<exact quote from TOS>",
             "explanation": "<brief explanation of what this clause means>",
             "why_this_matters": "<why users should care about this>",
             "quote_reference": "<section number or identifier>"
           }
         ]
       }
     ],
     "metadata": {
       "analyzed_at": "<ISO timestamp>",
       "word_count": <number>,
       "estimated_read_time": "<X minutes>"
     }
   }
   
   IMPORTANT: Categorize clauses as follows:
   - "Privacy": Data collection, sharing, tracking, cookies, third-party analytics
   - "Liability": Warranties, disclaimers, limitation of liability, indemnification
   - "Rights": User rights, licenses, content ownership, intellectual property (non-AI)
   - "Changes": How/when terms can be modified, notification requirements
   - "Termination": Account closure, service termination, data deletion
   - "Payment": Fees, refunds, billing, subscriptions, pricing changes
   - "AI & Data Use": AI training on user content, machine learning, content licensing for AI, 
                       model training opt-out options, generative AI features, automated decision-making,
                       whether content is used to improve AI models, intellectual property claims on AI outputs

CRITICAL: Pay special attention to "AI & Data Use" clauses. Look for:
   • Explicit statements about using user content to train AI/ML models
   • Rights granted to use content for "improving services" or "machine learning"
   • Lack of opt-out mechanisms for AI training
   • Claims of ownership over AI-generated content
   • Broad licenses that could permit AI training
   • Vague language like "service improvement" that may include AI training
   • Differences in treatment between free and paid users regarding AI training

Mark as CRITICAL if:
   • User content is used for AI training WITHOUT clear opt-out
   • Company claims ownership of user-created content for AI purposes
   • Broad, irrevocable licenses are granted that enable AI training

Mark as CONCERNING if:
   • AI training is mentioned but opt-out is unclear or difficult
   • Vague language could permit AI training
   • Only paid users can opt out of AI training

Mark as SAFE if:
   • Clear statement that user content is NOT used for AI training
   • Easy, accessible opt-out mechanism provided
   • User retains full ownership and control

Be thorough but concise. Focus on what matters most to everyday users.`;

/**
 * User prompt template for TOS analysis
 */
function buildUserPrompt(tosText: string, wordCount: number): string {
  return `Please analyze the following Terms of Service document. Provide a comprehensive analysis in the JSON format specified in your system prompt.

DOCUMENT TO ANALYZE:
---
${tosText}
---

Word count: ${wordCount}

Provide your analysis as a valid JSON object. Be thorough but focus on the most important aspects that users should know.`;
}

/**
 * Main ClaudeAnalyzer class
 */
export class ClaudeAnalyzer {
  private maxRetries = 3;
  private retryDelay = 1000; // Base delay in ms
  
  /**
   * Analyze TOS text with caching and retry logic
   */
  async analyze(tosText: string, skipCache: boolean = false): Promise<{
    result: AnalysisResult;
    cached: boolean;
    tokensUsed?: number;
  }> {
    // Normalize and hash content for caching
    const normalizedText = normalizeText(tosText);
    const contentHash = hashContent(tosText);
    
    // Check cache first (unless explicitly skipped)
    if (!skipCache) {
      const cached = await getCachedAnalysis(contentHash);
      if (cached) {
        console.log(`Cache HIT for hash: ${contentHash.substring(0, 16)}...`);
        return {
          result: cached as AnalysisResult,
          cached: true,
        };
      }
      console.log(`Cache MISS for hash: ${contentHash.substring(0, 16)}...`);
    }
    
    // Analyze with Claude API (with retry logic)
    const result = await this.analyzeWithClaude(tosText);
    
    // Cache the result
    await cacheAnalysis(contentHash, result.analysis);
    
    return {
      result: result.analysis,
      cached: false,
      tokensUsed: result.tokensUsed,
    };
  }
  
  /**
   * Analyze TOS text using Claude API
   * Handles chunking for large documents and retry logic
   */
  private async analyzeWithClaude(tosText: string): Promise<{
    analysis: AnalysisResult;
    tokensUsed: number;
  }> {
    const wordCount = tosText.trim().split(/\s+/).length;
    
    // Check if text needs chunking (>45k words to be safe)
    if (wordCount > 45000) {
      return await this.analyzeChunked(tosText, wordCount);
    }
    
    // Single-pass analysis
    return await this.analyzeSinglePass(tosText, wordCount);
  }
  
  /**
   * Analyze TOS in a single API call
   */
  private async analyzeSinglePass(tosText: string, wordCount: number): Promise<{
    analysis: AnalysisResult;
    tokensUsed: number;
  }> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`Calling Gemini API (attempt ${attempt + 1}/${this.maxRetries})...`);
        
        const prompt = `${SYSTEM_PROMPT}\n\n${buildUserPrompt(tosText, wordCount)}`;
        
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        if (!text) {
          throw new Error('No text content in Gemini response');
        }
        
        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in Gemini response');
        }
        
        const parsedData = JSON.parse(jsonMatch[0]);
        
        // Validate against schema
        const analysis = AnalysisResultSchema.parse(parsedData);
        
        // Calculate tokens used (approximate from response metadata)
        const tokensUsed = (response.usageMetadata?.promptTokenCount || 0) + 
                          (response.usageMetadata?.candidatesTokenCount || 0);
        
        console.log(`Analysis successful. Tokens used: ${tokensUsed}`);
        
        return {
          analysis,
          tokensUsed,
        };
        
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt + 1} failed:`, error);
        
        // Don't retry on validation errors
        if (error instanceof z.ZodError) {
          throw new Error(`Invalid analysis format: ${error.message}`);
        }
        
        // Exponential backoff before retry
        if (attempt < this.maxRetries - 1) {
          const delay = calculateBackoff(attempt, this.retryDelay);
          console.log(`Retrying in ${delay}ms...`);
          await sleep(delay);
        }
      }
    }
    
    // All retries failed
    throw new Error(`Analysis failed after ${this.maxRetries} attempts: ${lastError?.message}`);
  }
  
  /**
   * Analyze large TOS documents by chunking
   * Splits document into chunks, analyzes each, then synthesizes results
   */
  private async analyzeChunked(tosText: string, wordCount: number): Promise<{
    analysis: AnalysisResult;
    tokensUsed: number;
  }> {
    console.log(`Document is large (${wordCount} words), using chunked analysis...`);
    
    // Split into chunks
    const chunks = chunkText(tosText, 40000); // 40k words per chunk
    console.log(`Split into ${chunks.length} chunks`);
    
    // Analyze each chunk
    const chunkResults: AnalysisResult[] = [];
    let totalTokens = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      console.log(`Analyzing chunk ${i + 1}/${chunks.length}...`);
      const chunkWordCount = chunks[i].split(/\s+/).length;
      const result = await this.analyzeSinglePass(chunks[i], chunkWordCount);
      chunkResults.push(result.analysis);
      totalTokens += result.tokensUsed;
      
      // Rate limiting: wait between chunks
      if (i < chunks.length - 1) {
        await sleep(1000);
      }
    }
    
    // Synthesize results from chunks
    const synthesized = await this.synthesizeChunks(chunkResults, wordCount);
    totalTokens += synthesized.tokensUsed;
    
    return {
      analysis: synthesized.analysis,
      tokensUsed: totalTokens,
    };
  }
  
  /**
   * Synthesize multiple chunk analyses into a single comprehensive analysis
   */
  private async synthesizeChunks(chunks: AnalysisResult[], totalWordCount: number): Promise<{
    analysis: AnalysisResult;
    tokensUsed: number;
  }> {
    console.log('Synthesizing chunk results...');
    
    // Build synthesis prompt
    const synthesisPrompt = `I have analyzed a large Terms of Service document in ${chunks.length} chunks. Below are the individual chunk analyses. Please synthesize these into a single comprehensive analysis following the same JSON format.

Focus on:
- Identifying patterns across chunks
- Prioritizing the most critical concerns
- Removing duplicate findings
- Creating a coherent overall assessment

CHUNK ANALYSES:
${chunks.map((chunk, i) => `\n--- CHUNK ${i + 1} ---\n${JSON.stringify(chunk, null, 2)}`).join('\n')}

Provide a synthesized analysis as a JSON object in the same format. The overall_score should reflect the worst aspects found across all chunks. Include metadata showing the full document word count: ${totalWordCount}.`;
    
    const prompt = `${SYSTEM_PROMPT}\n\n${synthesisPrompt}`;
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('No text content in synthesis response');
    }
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in synthesis response');
    }
    
    const parsedData = JSON.parse(jsonMatch[0]);
    const analysis = AnalysisResultSchema.parse(parsedData);
    
    const tokensUsed = (response.usageMetadata?.promptTokenCount || 0) + 
                      (response.usageMetadata?.candidatesTokenCount || 0);
    
    console.log(`Synthesis successful. Tokens used: ${tokensUsed}`);
    
    return {
      analysis,
      tokensUsed,
    };
  }
  
  /**
   * Health check - verify Gemini API is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await model.generateContent('Respond with OK if you can read this.');
      const response = result.response;
      return response.text().length > 0;
    } catch (error) {
      console.error('Gemini API health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const geminiAnalyzer = new ClaudeAnalyzer();
export default geminiAnalyzer;
