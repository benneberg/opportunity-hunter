import type {
  DeveloperProfile,
  Opportunity,
  OpportunityAssessment,
  OpportunityCategory,
  ScoringWeights,
} from '../src/types';

export const DEFAULT_WEIGHTS: ScoringWeights;
export const OPPORTUNITY_CATEGORIES: OpportunityCategory[];

export function escapeRegex(str: string): string;
export function hasSignalMatch(haystackLower: string, term: string): boolean;
export function sanitizeText(raw: unknown, maxLen?: number): string;
export function sanitizeUrl(raw: unknown): string;
export function canonicalizeUrl(rawUrl?: string): string;
export function normalizeTitle(title?: string): string;
export function buildDedupeKey(item: {url?: string; organization?: string; title?: string}): string;
export function daysUntilDeadline(deadline?: string): number | null;
export function inferExternalStatus(
  explicit: Opportunity['externalStatus'] | undefined,
  deadline?: string
): Opportunity['externalStatus'];
export function scoreOpportunity(
  item: Pick<
    Opportunity,
    | 'title'
    | 'organization'
    | 'category'
    | 'location'
    | 'summary'
    | 'compensation'
    | 'deadline'
    | 'tags'
    | 'externalStatus'
    | 'workflowStatus'
  >,
  profile: DeveloperProfile
): OpportunityAssessment;
