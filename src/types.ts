export type OpportunityCategory =
  | 'Recruitment & Contracting'
  | 'Research & Model Evaluation'
  | 'Early Access & Credits'
  | 'Grants & Competitions'
  | 'Partnerships & Innovation'
  | 'Community & Fellowships';

export type ExternalStatus = 'open' | 'closing_soon' | 'closed' | 'unknown';

export type WorkflowStatus =
  | 'new'
  | 'saved'
  | 'preparing'
  | 'applied'
  | 'interview'
  | 'accepted'
  | 'rejected'
  | 'dismissed';

export type EligibilityStatus =
  | 'confirmed_eligible'
  | 'likely_eligible'
  | 'uncertain'
  | 'ineligible';

export interface ScoringWeights {
  skills: number;
  eligibility: number;
  preference: number;
  technical: number;
  urgency: number;
}

export interface FlagshipProject {
  id: string;
  name: string;
  focus: string;
  keywords: string[];
}

export interface DeveloperProfile {
  name: string;
  positioning: string;
  primaryLocation: string;
  skills: string[];
  preferredLocations: string[];
  blockedLocations: string[];
  preferredCategories: OpportunityCategory[];
  flagshipProjects: FlagshipProject[];
  weights: ScoringWeights;
}

export interface ScoreBreakdown {
  skills: number;
  eligibility: number;
  preference: number;
  technical: number;
  urgency: number;
}

export interface OpportunityAssessment {
  score: number;
  eligibility: EligibilityStatus;
  scoreBreakdown: ScoreBreakdown;
  matchedSignals: string[];
  missingChecks: string[];
  nextAction: string;
  rationale: string;
}

export interface Opportunity extends OpportunityAssessment {
  id: string;
  title: string;
  organization: string;
  category: OpportunityCategory;
  location: string;
  url: string;
  summary: string;
  compensation?: string;
  deadline?: string;
  tags: string[];
  externalStatus: ExternalStatus;
  workflowStatus: WorkflowStatus;
  notes?: string;
  discoveredAt: string;
  lastCheckedAt?: string;
  dedupeKey?: string;
  updatedAt?: string;
  source?: 'seed' | 'manual' | 'feed' | 'import';
}

export interface FeedSourceStat {
  id: string;
  status: 'ok' | 'error';
  fetched?: number;
  kept?: number;
  error?: string;
}

export interface FeedSyncStats {
  total: number;
  newlyAdded: number;
  updated: number;
  sources: FeedSourceStat[];
}

export interface AppState {
  opportunities: Opportunity[];
  profile: DeveloperProfile;
  lastFeedSync: string | null;
  feedStats?: FeedSyncStats | null;
  theme: 'light' | 'dark';
}

export type ActiveTab = 'dashboard' | 'opportunities' | 'pipeline' | 'profile';
