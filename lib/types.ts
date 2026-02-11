/**
 * Type Definitions for TOS Analyzer
 */

export type Severity = 'safe' | 'concerning' | 'critical';

export type RiskLevel = 'low' | 'medium' | 'high';

export type CategoryName = 
  | 'Privacy' 
  | 'Liability' 
  | 'Rights' 
  | 'Changes' 
  | 'Termination' 
  | 'Payment'
  | 'AI & Data Use';

export interface Clause {
  severity: Severity;
  original_text: string;
  explanation: string;
  why_this_matters: string;
  quote_reference: string;
}

export interface Category {
  name: CategoryName;
  clauses: Clause[];
}

export interface AnalysisSummary {
  overall_risk: RiskLevel;
  total_clauses: number;
  green_count: number;
  yellow_count: number;
  red_count: number;
  key_takeaways: string[];
}

export interface AnalysisResult {
  summary: AnalysisSummary;
  categories: Category[];
  metadata?: {
    analyzed_at?: string;
    model?: string;
    version?: string;
    input_tokens?: number;
    output_tokens?: number;
  };
}

export interface AnalysisResponse {
  success: boolean;
  data: {
    id: string;
    analysis: AnalysisResult;
    cached: boolean;
    tokens_used?: number;
    created_at: string;
    expires_at: string;
  };
}

export interface ShareableAnalysis {
  id: string;
  analysis: AnalysisResult;
  source_type: string;
  word_count: number;
  created_at: string;
  expires_at: string;
  view_count: number;
  is_public: boolean;
  company_name: string | null;
}

export interface PDFUploadResponse {
  success: boolean;
  data: {
    text: string;
    filename: string;
    size: number;
    pages?: number;
    word_count: number;
  };
}

export interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
    timestamp: string;
  };
}

export interface ErrorResponse {
  error: string;
  code?: string;
  timestamp?: string;
}
