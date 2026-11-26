import type {
  DeveloperProfile,
  EligibilityStatus,
  ExternalStatus,
  Opportunity,
  OpportunityAssessment,
  OpportunityCategory,
  ScoringWeights,
  WorkflowStatus,
} from '../types';

export const DEFAULT_WEIGHTS: ScoringWeights = {
  skills: 30,
  eligibility: 25,
  preference: 20,
  technical: 15,
  urgency: 10,
};

export const OPPORTUNITY_CATEGORIES: OpportunityCategory[] = [
  'Recruitment & Contracting',
  'Research & Model Evaluation',
  'Early Access & Credits',
  'Grants & Competitions',
  'Partnerships & Innovation',
  'Community & Fellowships',
];

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

const DEEP_TECH_SIGNALS = [
  'evaluation',
  'eval',
  'systems',
  'architecture',
  'failure',
  'human-in-the-loop',
  'hitl',
  'ast',
  'compiler',
  'debugging',
  'agent',
  'agents',
  'benchmark',
  'research',
  'tooling',
  'reasoning',
  'red-team',
  'safety',
];

export function sanitizeText(raw: unknown, maxLen = 600): string {
  return String(raw ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeUrl(raw: unknown): string {
  const candidate = String(raw ?? '').trim();
  if (!candidate) return '';
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return '';
  }
  return '';
}

export function canonicalizeUrl(rawUrl?: string): string {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    u.hash = '';
    const dropParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'gh_src'];
    for (const p of dropParams) u.searchParams.delete(p);
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return rawUrl.trim().toLowerCase();
  }
}

export function normalizeTitle(title?: string): string {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildDedupeKey(item: {url?: string; organization?: string; title?: string}): string {
  const canonUrl = canonicalizeUrl(item.url);
  if (canonUrl && !canonUrl.endsWith('/careers') && !canonUrl.endsWith('/jobs')) {
    return `url:${canonUrl}`;
  }
  return `org_title:${normalizeTitle(item.organization)}::${normalizeTitle(item.title)}`;
}

function normalizeWeights(weights: ScoringWeights): ScoringWeights {
  const sum =
    weights.skills +
    weights.eligibility +
    weights.preference +
    weights.technical +
    weights.urgency;
  if (sum <= 0) return DEFAULT_WEIGHTS;
  const factor = 100 / sum;
  return {
    skills: weights.skills * factor,
    eligibility: weights.eligibility * factor,
    preference: weights.preference * factor,
    technical: weights.technical * factor,
    urgency: weights.urgency * factor,
  };
}

export function daysUntilDeadline(deadline?: string): number | null {
  if (!deadline) return null;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const diffMs = parsed.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function inferExternalStatus(
  explicit: ExternalStatus | undefined,
  deadline?: string
): ExternalStatus {
  const days = daysUntilDeadline(deadline);
  if (days !== null) {
    if (days < 0) return 'closed';
    if (days <= 14) return 'closing_soon';
  }
  return explicit || 'open';
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
  const w = normalizeWeights(profile.weights || DEFAULT_WEIGHTS);
  const hay = [
    item.title,
    item.organization,
    item.category,
    item.location,
    item.summary,
    item.compensation || '',
    (item.tags || []).join(' '),
  ]
    .join(' ')
    .toLowerCase();

  // 1. Skill & Flagship Project Overlap
  const matchedSkills = profile.skills.filter((skill) =>
    hay.includes(skill.toLowerCase())
  );
  const matchedProjects = profile.flagshipProjects
    .filter(
      (proj) =>
        hay.includes(proj.name.toLowerCase()) ||
        proj.keywords.some((kw) => hay.includes(kw.toLowerCase()))
    )
    .map((p) => p.name);

  const signalUnits = matchedSkills.length + matchedProjects.length * 1.5;
  const skillRatio = Math.min(1, signalUnits / 5);
  const skillsPoints = Math.round(skillRatio * w.skills);

  // 2. Eligibility & Location Alignment (Sweden priority + remote/international)
  const locText = `${item.location || ''} ${item.summary || ''}`.toLowerCase();
  const primaryLower = profile.primaryLocation.toLowerCase();
  const blockedHit = profile.blockedLocations.find((b) =>
    locText.includes(b.toLowerCase())
  );

  let eligibility: EligibilityStatus = 'uncertain';
  let eligRatio = 0.4; // Uncertain stays conservative, never assumed eligible
  const missingChecks: string[] = [];

  if (blockedHit) {
    eligibility = 'ineligible';
    eligRatio = 0;
    missingChecks.push(`Restricted by exclusion rule: "${blockedHit}"`);
  } else if (
    locText.includes(primaryLower) ||
    locText.includes('sweden') ||
    locText.includes('stockholm') ||
    locText.includes('gothenburg') ||
    locText.includes('nordic')
  ) {
    eligibility = 'confirmed_eligible';
    eligRatio = 1.0;
  } else if (
    profile.preferredLocations.some((loc) =>
      locText.includes(loc.toLowerCase())
    ) ||
    locText.includes('remote') ||
    locText.includes('global') ||
    locText.includes('international') ||
    locText.includes('europe') ||
    locText.includes('eu')
  ) {
    eligibility = 'likely_eligible';
    eligRatio = 0.8;
    missingChecks.push(`Confirm ${profile.primaryLocation} contracting/residency terms`);
  } else {
    eligibility = 'uncertain';
    eligRatio = 0.35;
    missingChecks.push(`Location & ${profile.primaryLocation} eligibility not stated`);
  }

  const eligibilityPoints = Math.round(eligRatio * w.eligibility);

  // 3. Opportunity Type & Benefit Preference
  const isPreferredCat = profile.preferredCategories.includes(item.category);
  const hasCompSignal = Boolean(
    item.compensation && item.compensation.trim().length > 0
  ) || /paid|grant|credit|stipend|hourly|\$|€|sek|award/i.test(hay);
  const prefRatio = isPreferredCat
    ? hasCompSignal
      ? 1.0
      : 0.8
    : hasCompSignal
      ? 0.65
      : 0.45;
  const preferencePoints = Math.round(prefRatio * w.preference);
  if (!hasCompSignal) {
    missingChecks.push('Compensation or credit value unspecified');
  }

  // 4. Technical / AI Systems Relevance
  const techHits = DEEP_TECH_SIGNALS.filter((sig) => hay.includes(sig));
  const techRatio = Math.min(1, Math.max(0.25, techHits.length / 3.5));
  const technicalPoints = Math.round(techRatio * w.technical);

  // 5. Deadline Urgency & Effort Fit
  const effectiveExtStatus = inferExternalStatus(
    item.externalStatus,
    item.deadline
  );
  const daysLeft = daysUntilDeadline(item.deadline);
  let urgencyRatio = 0.65;
  if (effectiveExtStatus === 'closed') {
    urgencyRatio = 0;
    missingChecks.push('Opportunity window appears closed');
  } else if (effectiveExtStatus === 'closing_soon' || (daysLeft !== null && daysLeft <= 14)) {
    urgencyRatio = 1.0;
  } else if (!item.deadline) {
    urgencyRatio = 0.6;
    missingChecks.push('No explicit deadline recorded');
  }
  const urgencyPoints = Math.round(urgencyRatio * w.urgency);

  let total =
    skillsPoints +
    eligibilityPoints +
    preferencePoints +
    technicalPoints +
    urgencyPoints;

  // Hard Eligibility Gate: ineligible items never masquerade as top matches
  if (eligibility === 'ineligible') {
    total = Math.min(35, total);
  }
  if (effectiveExtStatus === 'closed') {
    total = Math.min(30, total);
  }
  total = Math.max(0, Math.min(100, total));

  const matchedSignals = Array.from(
    new Set([
      ...matchedSkills,
      ...matchedProjects.map((p) => `Project: ${p}`),
      ...(eligibility === 'confirmed_eligible' ? [profile.primaryLocation] : []),
    ])
  );

  let nextAction = 'Review listing requirements and verify eligibility';
  if (eligibility === 'ineligible') {
    nextAction = 'Dismiss or keep on watch only for future international tracks';
  } else if (effectiveExtStatus === 'closed') {
    nextAction = 'Archive or monitor for next cohort cycle';
  } else if (item.workflowStatus === 'applied') {
    nextAction = 'Track response and prepare technical evaluation work sample';
  } else if (item.workflowStatus === 'preparing') {
    nextAction = 'Finalize application brief referencing ContextCompiler / Lena AI 2.0';
  } else if (effectiveExtStatus === 'closing_soon') {
    nextAction = 'Prioritize submission before upcoming deadline';
  } else if (total >= 80) {
    nextAction = 'Move to Preparing and tailor systems/eval portfolio notes';
  }

  const eligibilityLabel = eligibility.replace('_', ' ');
  const rationale = `Signals: ${
    matchedSignals.slice(0, 5).join(', ') || 'general AI'
  } · Eligibility: ${eligibilityLabel}`;

  return {
    score: total,
    eligibility,
    scoreBreakdown: {
      skills: skillsPoints,
      eligibility: eligibilityPoints,
      preference: preferencePoints,
      technical: technicalPoints,
      urgency: urgencyPoints,
    },
    matchedSignals,
    missingChecks,
    nextAction,
    rationale,
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

export function parseUntrustedJsonBatch(
  rawJson: string,
  profile: DeveloperProfile
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
          `import-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`;

        const dedupeKey =
          sanitizeText(entry.dedupeKey, 160) ||
          buildDedupeKey({url, organization, title});

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
          discoveredAt: sanitizeText(entry.discoveredAt, 20) || nowDate,
          lastCheckedAt: sanitizeText(entry.lastCheckedAt, 20) || nowDate,
          source: 'import' as const,
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
