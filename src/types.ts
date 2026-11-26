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
  | 'requires_verification'
  | 'confirmed_ineligible';

export type VerificationStatus =
  | 'verified'
  | 'unverified'
  | 'unavailable'
  | 'expired'
  | 'demo';

export type DeadlineUrgency = 'urgent' | 'normal' | 'open' | 'closed';
export type ApplicationEffort = 'low' | 'medium' | 'high';
export type ExpectedValue = 'high' | 'medium' | 'standard';

export type SyncStatus =
  | 'synced_updated'
  | 'synced_no_changes'
  | 'partial_sync'
  | 'sync_failed'
  | 'feed_unavailable';

export interface OpportunityProvenance {
  sourceId: string;
  sourceName: string;
  sourceUrl?: string;
  discoveredAt: string;
  lastVerifiedAt?: string;
  verificationStatus: VerificationStatus;
  /** Set only when the user confirmed the listing at its source. */
  verifiedBy?: 'user';
}

export type ItemType = 'opportunity' | 'announcement';

export interface ResourceLink {
  id: string;
  name: string;
  url: string;
  type: string;
  note?: string;
  source: 'feed' | 'user';
}

export interface ProjectMatch {
  projectName: string;
  reason: string;
  strength: 'high' | 'medium';
}

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
  opportunityQuality: number;
  eligibility: EligibilityStatus;
  eligibilityReason: string;
  deadlineUrgency: DeadlineUrgency;
  applicationEffort: ApplicationEffort;
  expectedValue: ExpectedValue;
  projectMatches: ProjectMatch[];
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
  provenance?: OpportunityProvenance;
  itemType?: ItemType;
  excludedRegions?: string[];
  eligibilityNote?: string;
}

export interface FeedSourceStat {
  id: string;
  name?: string;
  status: 'ok' | 'error';
  fetched?: number;
  kept?: number;
  error?: string;
}

export interface FeedSyncStats {
  total: number;
  newlyAdded: number;
  updated: number;
  syncHealth?: 'healthy' | 'partial' | 'failed';
  sources: FeedSourceStat[];
}

export interface AppState {
  opportunities: Opportunity[];
  profile: DeveloperProfile;
  lastFeedSync: string | null;
  feedStats?: FeedSyncStats | null;
  syncStatus?: SyncStatus;
  syncError?: string | null;
  theme: 'light' | 'dark';
  resources?: ResourceLink[];
}

export type ActiveTab = 'dashboard' | 'opportunities' | 'other' | 'pipeline' | 'profile';
