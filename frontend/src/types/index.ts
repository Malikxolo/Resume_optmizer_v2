/* ═══════════════════════════════════════════════════════════════════
   TypeScript types matching the backend Pydantic schemas
   ═══════════════════════════════════════════════════════════════════ */

export interface SubCriterionScore {
  criterion: string;
  score: number;
  weight: number;
  justification: string;
}

export interface ATSScore {
  total_score: number;
  sub_scores: SubCriterionScore[];
  prev_total?: number;
}

export interface AIScreeningScore {
  total_score: number;
  sub_scores: SubCriterionScore[];
  prev_total?: number;
}

export interface ResumeIssue {
  section: string;
  exact_text_snippet: string;
  issue_type: string;
  severity: "critical" | "major" | "minor";
  suggestion: string;
}

export interface MissingContent {
  category: string;
  jd_requirement: string;
  recommendation: string;
}

export interface ScoringResult {
  ats_score: ATSScore;
  ai_screening_score: AIScreeningScore;
  issues: ResumeIssue[];
  missing_content: MissingContent[];
}

export interface VerificationFlag {
  flagged_text: string;
  reason: string;
  location_in_draft: string;
}

export interface VerificationResult {
  flags: VerificationFlag[];
  is_clean: boolean;
}

export interface SessionState {
  session_id: string;
  current_version: number;
  tex_content: string;
  plaintext: string;
  jd_text: string;
}

export interface VersionInfo {
  version: number;
  ats_score: number | null;
  ai_score: number | null;
  change_summary: string;
  created_at: string;
}

export interface EditResult {
  version: number;
  tex_content: string;
  plaintext: string;
  change_summary: string;
  compile_error: string | null;
  has_pdf: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: string;
}

// App state
export type AppPhase = "upload" | "analyzing" | "results" | "chat";
