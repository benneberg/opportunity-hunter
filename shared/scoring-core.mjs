const DEFAULT_WEIGHTS = {
  skills: 30,
  eligibility: 25,
  preference: 20,
  technical: 15,
  urgency: 10,
};

const OPPORTUNITY_CATEGORIES = [
  'Recruitment & Contracting',
  'Research & Model Evaluation',
  'Early Access & Credits',
  'Grants & Competitions',
  'Partnerships & Innovation',
  'Community & Fellowships',
];

const DEEP_TECH_PHRASES = [
  'model evaluation',
  'llm evaluation',
  'evaluation',
  'failure analysis',
  'failure mode',
  'human-in-the-loop',
  'hitl',
  'systems architecture',
  'ai systems',
  'developer tooling',
  'static analysis',
  'compiler',
  'ast',
  'debugging',
  'autonomous agent',
  'agentic',
  'benchmark',
  'red-team',
  'red team',
  'ai safety',
  'interpretability',
  'reasoning',
];

const NON_EU_CITY_HINTS = [
  'san francisco, ca',
  'new york city, ny',
  'new york, ny',
  'seattle, wa',
  'washington, dc',
  'boston, ma',
  'austin, tx',
  'palo alto, ca',
  'mountain view, ca',
  'menlo park, ca',
  'los angeles, ca',
  'chicago, il',
];

const NEGATIVE_SIGNALS = [
  'no remote',
  'in-office 5 days',
  'on-site required',
  'requires security clearance',
  'unpaid volunteer',
];

export function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Word-boundary / phrase-aware matcher so short tokens like "eval" or "ast"
 * do not falsely match unrelated substrings (e.g. "medieval", "forecast").
 */
export function hasSignalMatch(haystackLower, term) {
  const clean = String(term || '').trim().toLowerCase();
  if (!clean) return false;
  if (clean.includes(' ') || clean.includes('-')) {
    const pattern = new RegExp(`(?<![a-z0-9])${escapeRegex(clean)}(?![a-z0-9])`, 'i');
    return pattern.test(haystackLower);
  }
  const pattern = new RegExp(`\\b${escapeRegex(clean)}\\b`, 'i');
  return pattern.test(haystackLower);
}

export function sanitizeText(raw, maxLen = 600) {
  return String(raw ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeUrl(raw) {
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

export function canonicalizeUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(String(rawUrl).trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    u.hash = '';
    const dropParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'gh_src'];
    for (const p of dropParams) u.searchParams.delete(p);
    return u.toString().replace(/\/$/, '').toLowerCase();
  } catch {
    return String(rawUrl || '').trim().toLowerCase();
  }
}

export function normalizeTitle(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildDedupeKey(item) {
  const canonUrl = canonicalizeUrl(item.url);
  if (canonUrl && !canonUrl.endsWith('/careers') && !canonUrl.endsWith('/jobs')) {
    return `url:${canonUrl}`;
  }
  return `org_title:${normalizeTitle(item.organization)}::${normalizeTitle(item.title)}`;
}

export function daysUntilDeadline(deadline) {
  if (!deadline) return null;
  const parsed = new Date(deadline);
  if (Number.isNaN(parsed.getTime())) return null;
  const diffMs = parsed.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function inferExternalStatus(explicit, deadline) {
  const days = daysUntilDeadline(deadline);
  if (days !== null) {
    if (days < 0) return 'closed';
    if (days <= 14) return 'closing_soon';
  }
  return explicit || 'open';
}

function normalizeWeights(weights) {
  const w = weights || DEFAULT_WEIGHTS;
  const sum = Number(w.skills) + Number(w.eligibility) + Number(w.preference) + Number(w.technical) + Number(w.urgency);
  if (!sum || sum <= 0) return DEFAULT_WEIGHTS;
  const factor = 100 / sum;
  return {
    skills: w.skills * factor,
    eligibility: w.eligibility * factor,
    preference: w.preference * factor,
    technical: w.technical * factor,
    urgency: w.urgency * factor,
  };
}

function evaluateProjectMatches(haystackLower, flagshipProjects) {
  const matches = [];
  for (const proj of flagshipProjects || []) {
    const nameHit = hasSignalMatch(haystackLower, proj.name);
    const matchedKws = (proj.keywords || []).filter((kw) => hasSignalMatch(haystackLower, kw));
    if (nameHit || matchedKws.length >= 2) {
      matches.push({
        projectName: proj.name,
        strength: nameHit || matchedKws.length >= 3 ? 'high' : 'medium',
        reason: nameHit
          ? `Direct alignment with ${proj.name} (${proj.focus})`
          : `Matches ${proj.name} domain via [${matchedKws.slice(0, 4).join(', ')}]`,
      });
    }
  }
  return matches;
}

const STRONG_REGION_TERMS = ['worldwide', 'global', 'international', 'anywhere', 'europe', 'european', 'eu', 'eea', 'emea', 'nordic'];
const US_LOCATION_TERMS = ['united states', 'usa', 'us', 'north america', 'americas'];

/**
 * Eligibility is conservative by design:
 * - Only the listing's LOCATION field can raise eligibility; description text never confirms it.
 * - Plain "remote" is NOT enough: many remote roles are restricted to specific countries.
 * - "confirmed_eligible" requires the record to have been verified by the user.
 */
function assessEligibility(item, hayLower, profile) {
  const locText = `${item.location || ''}`.toLowerCase();
  const combinedLoc = `${locText} ${hayLower}`;
  const primary = profile.primaryLocation || 'Sweden';
  const primaryLower = String(primary).toLowerCase();
  const isUserVerified = item.provenance?.verificationStatus === 'verified';

  const reportedExcluded = (item.excludedRegions || []).some(
    (r) => String(r).toLowerCase() === primaryLower
  );
  if (reportedExcluded) {
    return {
      eligibility: 'confirmed_ineligible',
      eligRatio: 0,
      eligibilityReason: item.eligibilityNote || `Reported restriction for ${primary} (unverified; check the source)`,
    };
  }

  const blockedHit = (profile.blockedLocations || []).find((b) => hasSignalMatch(combinedLoc, b));
  if (blockedHit) {
    return {
      eligibility: 'confirmed_ineligible',
      eligRatio: 0,
      eligibilityReason: `Excluded by explicit restriction: "${blockedHit}"`,
    };
  }

  const swedenTerms = [primaryLower, 'sweden', 'stockholm', 'gothenburg', 'malmö'];
  if (swedenTerms.some((t) => hasSignalMatch(locText, t))) {
    return isUserVerified
      ? {
          eligibility: 'confirmed_eligible',
          eligRatio: 1.0,
          eligibilityReason: `Location names ${primary} and you verified the listing`,
        }
      : {
          eligibility: 'likely_eligible',
          eligRatio: 0.9,
          eligibilityReason: `Location names ${primary} ("${item.location}"); mark as verified after checking the source`,
        };
  }

  const extraPreferred = (profile.preferredLocations || [])
    .map((l) => String(l).toLowerCase())
    .filter((l) => l !== 'remote' && l !== primaryLower);
  const hasStrongRegion = [...STRONG_REGION_TERMS, ...extraPreferred].some((t) =>
    hasSignalMatch(locText, t)
  );
  const hasUsHint =
    US_LOCATION_TERMS.some((t) => hasSignalMatch(locText, t)) ||
    NON_EU_CITY_HINTS.some((city) => locText.includes(city));
  const isRemote = hasSignalMatch(locText, 'remote');

  if (hasStrongRegion && !hasUsHint) {
    return {
      eligibility: 'likely_eligible',
      eligRatio: 0.8,
      eligibilityReason: `Listing location is open to Europe/worldwide ("${item.location}"); verify ${primary} contracting terms`,
    };
  }
  if (hasStrongRegion && hasUsHint) {
    return {
      eligibility: 'requires_verification',
      eligRatio: 0.5,
      eligibilityReason: `Lists both a European/global option and a US location ("${item.location}"); check which applies to ${primary}`,
    };
  }
  if (hasUsHint && !isRemote) {
    return {
      eligibility: 'confirmed_ineligible',
      eligRatio: 0.05,
      eligibilityReason: `On-site US/non-EU location (${item.location}) without a remote or Europe option`,
    };
  }
  if (hasUsHint && isRemote) {
    return {
      eligibility: 'requires_verification',
      eligRatio: 0.3,
      eligibilityReason: `Remote but tied to a US location ("${item.location}"); confirm contracting from ${primary} is allowed`,
    };
  }
  if (isRemote) {
    return {
      eligibility: 'requires_verification',
      eligRatio: 0.5,
      eligibilityReason: `Remote, but the allowed regions are not stated; many remote roles are limited to specific countries`,
    };
  }
  return {
    eligibility: 'requires_verification',
    eligRatio: 0.35,
    eligibilityReason: `Eligibility for ${primary} not stated in the listing`,
  };
}

export function scoreOpportunity(item, profile) {
  const w = normalizeWeights(profile.weights);
  const hayLower = [
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

  // 1. Skills & Flagship Project Relevance (30%)
  const matchedSkills = (profile.skills || []).filter((s) => hasSignalMatch(hayLower, s));
  const projectMatches = evaluateProjectMatches(hayLower, profile.flagshipProjects);
  const negativeHits = NEGATIVE_SIGNALS.filter((neg) => hasSignalMatch(hayLower, neg));

  const signalUnits = matchedSkills.length + projectMatches.length * 1.5 - negativeHits.length * 1.0;
  const skillRatio = Math.max(0, Math.min(1, signalUnits / 5));
  const skillsPoints = Math.round(skillRatio * w.skills);

  // 2. Eligibility Evidence & Location (25%)
  const eligResult = assessEligibility(item, hayLower, profile);
  const eligibilityPoints = Math.round(eligResult.eligRatio * w.eligibility);

  // 3. Opportunity Category & Expected Value (20%)
  const isPreferredCat = (profile.preferredCategories || []).includes(item.category);
  const hasCompSignal =
    Boolean(item.compensation && String(item.compensation).trim()) ||
    /\b(paid|grant|credits?|stipend|hourly|salary|bounty|award|sek|eur|usd)\b|\$|€|£/i.test(hayLower);

  const expectedValue = hasCompSignal && isPreferredCat ? 'high' : hasCompSignal || isPreferredCat ? 'medium' : 'standard';
  const prefRatio = isPreferredCat ? (hasCompSignal ? 1.0 : 0.78) : hasCompSignal ? 0.65 : 0.45;
  const preferencePoints = Math.round(prefRatio * w.preference);

  // 4. AI Systems & Evaluation Depth (15%)
  const techHits = DEEP_TECH_PHRASES.filter((phrase) => hasSignalMatch(hayLower, phrase));
  const techRatio = Math.min(1, Math.max(0.2, techHits.length / 3.5));
  const technicalPoints = Math.round(techRatio * w.technical);

  // 5. Practical fit (10%): how much effort the application takes.
  // Deadline urgency is NOT part of the score: it is reported separately as `deadlineUrgency`
  // so a looming deadline never makes a weak match look better. (The weight key stays `urgency`
  // for compatibility with stored profiles; the UI labels it "Practical Fit".)
  const effectiveExtStatus = inferExternalStatus(item.externalStatus, item.deadline);
  const daysLeft = daysUntilDeadline(item.deadline);
  let deadlineUrgency = 'open';
  if (effectiveExtStatus === 'closed') deadlineUrgency = 'closed';
  else if (effectiveExtStatus === 'closing_soon' || (daysLeft !== null && daysLeft <= 14)) deadlineUrgency = 'urgent';
  else if (item.deadline) deadlineUrgency = 'normal';

  const applicationEffort =
    item.category === 'Grants & Competitions' || item.category === 'Community & Fellowships'
      ? 'high'
      : item.category === 'Early Access & Credits' || /prolific|study|credits/i.test(hayLower)
        ? 'low'
        : 'medium';
  const practicalRatio = applicationEffort === 'low' ? 1.0 : applicationEffort === 'medium' ? 0.75 : 0.5;
  const urgencyPoints = Math.round(practicalRatio * w.urgency);

  const qualityMax = w.skills + w.eligibility + w.preference + w.technical;
  const opportunityQuality = Math.round(
    ((skillsPoints + eligibilityPoints + preferencePoints + technicalPoints) / (qualityMax || 90)) * 100
  );

  let total = skillsPoints + eligibilityPoints + preferencePoints + technicalPoints + urgencyPoints;
  if (eligResult.eligibility === 'confirmed_ineligible') {
    total = Math.min(35, total);
  }
  if (deadlineUrgency === 'closed') {
    total = Math.min(40, total);
  }
  if (effectiveExtStatus === 'closed') {
    total = Math.min(30, total);
  }
  total = Math.max(0, Math.min(100, total));

  const missingChecks = [];
  if (eligResult.eligibility === 'confirmed_ineligible') {
    missingChecks.push(eligResult.eligibilityReason);
  } else if (eligResult.eligibility !== 'confirmed_eligible') {
    missingChecks.push(eligResult.eligibilityReason);
  }
  if (!hasCompSignal) {
    missingChecks.push('Compensation or credit value unspecified');
  }
  if (!item.deadline) {
    missingChecks.push('No explicit deadline recorded');
  }
  if (negativeHits.length > 0) {
    missingChecks.push(`Negative signals detected: ${negativeHits.join(', ')}`);
  }

  const matchedSignals = Array.from(
    new Set([
      ...matchedSkills,
      ...projectMatches.map((p) => `Project: ${p.projectName}`),
      ...(eligResult.eligibility === 'confirmed_eligible' ? [profile.primaryLocation || 'Sweden'] : []),
    ])
  );

  let nextAction = 'Review listing requirements and verify eligibility';
  if (eligResult.eligibility === 'confirmed_ineligible') {
    nextAction = 'Archive or monitor only if remote/EU eligibility opens later';
  } else if (effectiveExtStatus === 'closed') {
    nextAction = 'Archive or monitor for next cohort cycle';
  } else if (item.workflowStatus === 'applied') {
    nextAction = 'Track response and prepare technical evaluation work sample';
  } else if (item.workflowStatus === 'preparing') {
    const topProj = projectMatches[0]?.projectName || 'ContextCompiler / Lena AI 2.0';
    nextAction = `Finalize application brief anchored on ${topProj}`;
  } else if (deadlineUrgency === 'urgent' && total >= 65) {
    nextAction = 'Prioritize submission before upcoming deadline';
  } else if (total >= 75) {
    const topProj = projectMatches[0]?.projectName;
    nextAction = topProj
      ? `Move to Preparing and highlight ${topProj} systems evidence`
      : 'Move to Preparing and tailor systems/eval portfolio notes';
  }

  const eligLabel = eligResult.eligibility.replace(/_/g, ' ');
  const rationale = `Signals: ${matchedSignals.slice(0, 5).join(', ') || 'general AI'} · ${eligLabel} · Effort: ${applicationEffort}`;

  return {
    score: total,
    opportunityQuality,
    eligibility: eligResult.eligibility,
    eligibilityReason: eligResult.eligibilityReason,
    deadlineUrgency,
    applicationEffort,
    expectedValue,
    projectMatches,
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

export {DEFAULT_WEIGHTS, OPPORTUNITY_CATEGORIES};
