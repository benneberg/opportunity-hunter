import type {
  DeveloperProfile,
  ExternalStatus,
  Opportunity,
  OpportunityAssessment,
  OpportunityCategory,
  OpportunityProvenance,
  ScoringWeights,
  VerificationStatus,
  WorkflowStatus,
} from '../types';
import {
  DEFAULT_WEIGHTS as RAW_DEFAULT_WEIGHTS,
  OPPORTUNITY_CATEGORIES as RAW_OPPORTUNITY_CATEGORIES,
  buildDedupeKey,
  canonicalizeUrl,
  daysUntilDeadline,
  escapeRegex,
  hasSignalMatch,
  inferExternalStatus as rawInferExternalStatus,
  normalizeTitle,
  sanitizeText,
  sanitizeUrl,
  scoreOpportunity as rawScoreOpportunity,
} from '../../shared/scoring-core.mjs';

export const DEFAULT_WEIGHTS: ScoringWeights = RAW_DEFAULT_WEIGHTS;

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] =
  RAW_OPPORTUNITY_CATEGORIES as OpportunityCategory[];

export function inferExternalStatus(
  explicit: ExternalStatus | undefined,
  deadline?: string
): ExternalStatus {
  return rawInferExternalStatus(explicit, deadline) as ExternalStatus;
}

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
): OpportunityAssessment {
  return rawScoreOpportunity(item, profile) as OpportunityAssessment;
}

export {
  buildDedupeKey,
  canonicalizeUrl,
  daysUntilDeadline,
  escapeRegex,
  hasSignalMatch,
  normalizeTitle,
  sanitizeText,
  sanitizeUrl,
};

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  'new',
  'saved',
  'preparing',
  'applied',
  'interview',
  'accepted',
  'rejected',
  'dismissed',
];

export const EXTERNAL_STATUSES: ExternalStatus[] = [
  'open',
  'closing_soon',
  'closed',
  'unknown',
];

const VERIFICATION_STATUSES: VerificationStatus[] = [
  'verified',
  'unverified',
  'unavailable',
  'expired',
  'demo',
];

function inferDefaultProvenance(
  opp: Pick<Opportunity, 'source' | 'discoveredAt' | 'lastCheckedAt' | 'provenance'>
): OpportunityProvenance {
  if (opp.provenance) return opp.provenance;
  const sourceType = opp.source || 'manual';
  if (sourceType === 'seed') {
    return {
      sourceId: 'demo-seed',
      sourceName: 'Demo Seed (Illustrative Sample)',
      discoveredAt: opp.discoveredAt,
      verificationStatus: 'demo',
    };
  }
  if (sourceType === 'feed') {
    return {
      sourceId: 'feed',
      sourceName: 'Automated Feed',
      discoveredAt: opp.discoveredAt,
      lastVerifiedAt: opp.lastCheckedAt,
      verificationStatus: 'verified',
    };
  }
  return {
    sourceId: sourceType,
    sourceName: sourceType === 'import' ? 'JSON Batch Import' : 'Manual Entry',
    discoveredAt: opp.discoveredAt,
    verificationStatus: 'unverified',
  };
}

export function rescoreAllOpportunities(
  opportunities: Opportunity[],
  profile: DeveloperProfile
): Opportunity[] {
  return opportunities.map((opp) => {
    const effectiveExternal = inferExternalStatus(opp.externalStatus, opp.deadline);
    const assessment = scoreOpportunity(
      { ...opp, externalStatus: effectiveExternal },
      profile
    );
    return {
      ...opp,
      externalStatus: effectiveExternal,
      provenance: inferDefaultProvenance(opp),
      ...assessment,
    };
  });
}

function normalizeCategory(raw: unknown): OpportunityCategory {
  const s = sanitizeText(raw, 80);
  const match = OPPORTUNITY_CATEGORIES.find(
    (c) => c.toLowerCase() === s.toLowerCase()
  );
  return match || 'Recruitment & Contracting';
}

function normalizeExternalStatus(raw: unknown): ExternalStatus {
  const s = sanitizeText(raw, 30).toLowerCase() as ExternalStatus;
  return EXTERNAL_STATUSES.includes(s) ? s : 'open';
}

function normalizeWorkflowStatus(raw: unknown): WorkflowStatus {
  const s = sanitizeText(raw, 30).toLowerCase() as WorkflowStatus;
  return WORKFLOW_STATUSES.includes(s) ? s : 'new';
}

function normalizeProvenance(
  raw: unknown,
  discoveredAt: string,
  defaultSource: 'feed' | 'import'
): OpportunityProvenance {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const p = raw as Record<string, unknown>;
    const vRaw = sanitizeText(p.verificationStatus, 30).toLowerCase() as VerificationStatus;
    const verificationStatus: VerificationStatus = VERIFICATION_STATUSES.includes(vRaw)
      ? vRaw
      : defaultSource === 'feed'
        ? 'verified'
        : 'unverified';
    return {
      sourceId: sanitizeText(p.sourceId, 80) || defaultSource,
      sourceName:
        sanitizeText(p.sourceName, 120) ||
        (defaultSource === 'feed' ? 'Automated Discovery Feed' : 'JSON Batch Import'),
      sourceUrl: sanitizeUrl(p.sourceUrl) || undefined,
      discoveredAt: sanitizeText(p.discoveredAt, 30) || discoveredAt,
      lastVerifiedAt: sanitizeText(p.lastVerifiedAt, 40) || undefined,
      verificationStatus,
    };
  }
  return {
    sourceId: defaultSource,
    sourceName: defaultSource === 'feed' ? 'Automated Discovery Feed' : 'JSON Batch Import',
    discoveredAt,
    verificationStatus: defaultSource === 'feed' ? 'verified' : 'unverified',
  };
}

export function parseUntrustedJsonBatch(
  rawJson: string,
  profile: DeveloperProfile,
  defaultSource: 'feed' | 'import' = 'import'
): { items: Opportunity[]; error?: string } {
  try {
    const parsed: unknown = JSON.parse(rawJson);
    const parsedObj =
      parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as {items?: unknown})
        : null;
    const rawList: unknown[] | null = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsedObj?.items)
        ? parsedObj.items
        : null;

    if (!rawList) {
      return {
        items: [],
        error: 'JSON must be an array of opportunities or an object with an "items" array.',
      };
    }

    const nowDate = new Date().toISOString().slice(0, 10);
    const items: Opportunity[] = rawList
      .filter((entry: unknown): entry is Record<string, unknown> =>
        Boolean(entry && typeof entry === 'object')
      )
      .map((entry: Record<string, unknown>, idx: number) => {
        const title = sanitizeText(entry.title, 180) || 'Untitled Opportunity';
        const organization = sanitizeText(entry.organization, 120) || 'Unknown Organization';
        const category = normalizeCategory(entry.category);
        const location = sanitizeText(entry.location, 120) || 'Location unspecified';
        const url = sanitizeUrl(entry.url);
        const summary = sanitizeText(entry.summary, 500);
        const compensation = sanitizeText(entry.compensation, 100);
        const deadline = sanitizeText(entry.deadline, 30);
        const tags = Array.isArray(entry.tags)
          ? entry.tags.map((t: unknown) => sanitizeText(t, 40)).filter(Boolean)
          : typeof entry.tags === 'string'
            ? entry.tags
                .split(',')
                .map((t: string) => sanitizeText(t, 40))
                .filter(Boolean)
            : [];

        const externalStatus = inferExternalStatus(
          normalizeExternalStatus(entry.externalStatus),
          deadline || undefined
        );
        const workflowStatus = normalizeWorkflowStatus(entry.workflowStatus);
        const id =
          sanitizeText(entry.id, 80) ||
          `${defaultSource}-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;

        const dedupeKey =
          sanitizeText(entry.dedupeKey, 160) ||
          buildDedupeKey({url, organization, title});

        const discoveredAt = sanitizeText(entry.discoveredAt, 20) || nowDate;
        const lastCheckedAt = sanitizeText(entry.lastCheckedAt, 20) || nowDate;
        const provenance = normalizeProvenance(entry.provenance, discoveredAt, defaultSource);

        const base = {
          id,
          dedupeKey,
          title,
          organization,
          category,
          location,
          url,
          summary,
          compensation: compensation || undefined,
          deadline: deadline || undefined,
          tags,
          externalStatus,
          workflowStatus,
          notes: sanitizeText(entry.notes, 500) || undefined,
          discoveredAt,
          lastCheckedAt,
          source: defaultSource,
          provenance,
        };

        const assessment = scoreOpportunity(base, profile);
        return { ...base, ...assessment };
      });

    return { items };
  } catch (err) {
    return {
      items: [],
      error: err instanceof Error ? err.message : 'Invalid JSON syntax.',
    };
  }
}
