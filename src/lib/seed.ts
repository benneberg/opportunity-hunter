import type {DeveloperProfile, Opportunity, OpportunityCategory} from '../types';
import defaultProfileJson from '../../shared/default-profile.json';
import {rescoreAllOpportunities} from './scoring';

export const INITIAL_PROFILE: DeveloperProfile = {
  ...defaultProfileJson,
  preferredCategories: defaultProfileJson.preferredCategories as OpportunityCategory[],
};

function relativeIsoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const RAW_SEED_OPPORTUNITIES: Array<
  Pick<
    Opportunity,
    | 'id'
    | 'title'
    | 'organization'
    | 'category'
    | 'location'
    | 'url'
    | 'summary'
    | 'compensation'
    | 'deadline'
    | 'tags'
    | 'externalStatus'
    | 'workflowStatus'
    | 'notes'
    | 'discoveredAt'
    | 'source'
    | 'provenance'
  >
> = [
  {
    id: 'seed-alignerr',
    title: 'Technical AI Model Evaluator & Coding Trainer (Demo Example)',
    organization: 'Alignerr',
    category: 'Research & Model Evaluation',
    location: 'Remote / Sweden supported (Contractor)',
    url: 'https://www.alignerr.com',
    summary:
      'Illustrative demo seed: evaluate LLM code reasoning, AST/debugging accuracy, agent tool-use trajectories, and failure-mode rubrics across TypeScript and Python.',
    compensation: '$45–$75/hr contractor',
    tags: ['llm', 'evaluation', 'agents', 'typescript', 'python', 'debugging'],
    externalStatus: 'open',
    workflowStatus: 'saved',
    notes: 'Demo seed example illustrating MiniCodi and ContextCompiler coding evaluation scoring.',
    discoveredAt: relativeIsoDate(-3),
    source: 'seed',
    provenance: {
      sourceId: 'demo-seed',
      sourceName: 'Demo Seed (Unverified Example)',
      sourceUrl: 'https://www.alignerr.com',
      discoveredAt: relativeIsoDate(-3),
      verificationStatus: 'demo',
    },
  },
  {
    id: 'seed-prolific',
    title: 'AI & Human-in-the-Loop Model Evaluation Studies (Demo Example)',
    organization: 'Prolific',
    category: 'Research & Model Evaluation',
    location: 'Remote / Sweden confirmed',
    url: 'https://www.prolific.com',
    summary:
      'Illustrative demo seed: human-in-the-loop model evaluation, safety preference ranking, and technical failure-analysis benchmarks.',
    compensation: '£12–£35/hr per study',
    tags: ['evaluation', 'human-in-the-loop', 'research', 'sweden', 'benchmark'],
    externalStatus: 'open',
    workflowStatus: 'new',
    discoveredAt: relativeIsoDate(-2),
    source: 'seed',
    provenance: {
      sourceId: 'demo-seed',
      sourceName: 'Demo Seed (Unverified Example)',
      sourceUrl: 'https://www.prolific.com',
      discoveredAt: relativeIsoDate(-2),
      verificationStatus: 'demo',
    },
  },
  {
    id: 'seed-vinnova-ai',
    title: 'Applied AI Systems & Industrial Tooling Grant (Demo Example)',
    organization: 'Vinnova (Sweden Innovation Agency)',
    category: 'Grants & Competitions',
    location: 'Sweden (Stockholm / Remote Sweden)',
    url: 'https://www.vinnova.se',
    summary:
      'Illustrative demo seed: funding call example for independent Swedish builders shipping verifiable AI systems, IoT telemetry diagnostics, and developer infrastructure.',
    compensation: 'Up to 500,000 SEK grant',
    deadline: relativeIsoDate(9),
    tags: ['sweden', 'iot', 'telemetry', 'grant', 'model evaluation'],
    externalStatus: 'closing_soon',
    workflowStatus: 'preparing',
    notes: 'Demo seed example showing Sweden-priority grant and INSIKT telemetry scoring.',
    discoveredAt: relativeIsoDate(-5),
    source: 'seed',
    provenance: {
      sourceId: 'demo-seed',
      sourceName: 'Demo Seed (Unverified Example)',
      sourceUrl: 'https://www.vinnova.se',
      discoveredAt: relativeIsoDate(-5),
      verificationStatus: 'demo',
    },
  },
  {
    id: 'seed-anthropic-credits',
    title: 'Frontier Model Evaluation & Safety Research API Credits (Demo Example)',
    organization: 'Anthropic External Researcher Program',
    category: 'Early Access & Credits',
    location: 'Remote / International (Sweden eligible)',
    url: 'https://www.anthropic.com',
    summary:
      'Illustrative demo seed: API compute credits and evaluation harness access for independent researchers building deterministic agent failure-analysis suites.',
    compensation: '$5,000–$25,000 API credits',
    deadline: relativeIsoDate(12),
    tags: ['llm', 'model evaluation', 'agents', 'benchmark', 'failure analysis', 'sweden'],
    externalStatus: 'closing_soon',
    workflowStatus: 'new',
    discoveredAt: relativeIsoDate(-1),
    source: 'seed',
    provenance: {
      sourceId: 'demo-seed',
      sourceName: 'Demo Seed (Unverified Example)',
      sourceUrl: 'https://www.anthropic.com',
      discoveredAt: relativeIsoDate(-1),
      verificationStatus: 'demo',
    },
  },
  {
    id: 'seed-eu-ai-benchmark',
    title: 'European Open-Source Agent Reliability Fellowship (Demo Example)',
    organization: 'EuroAI Commons',
    category: 'Community & Fellowships',
    location: 'Europe / Remote',
    url: 'https://digital-strategy.ec.europa.eu',
    summary:
      'Illustrative demo seed: 6-month remote fellowship supporting open-source AST tooling, deterministic eval harnesses, and reproducible agent debugging benchmarks.',
    compensation: '€3,500/mo stipend',
    deadline: relativeIsoDate(28),
    tags: ['ast', 'developer tooling', 'agents', 'evaluation', 'europe'],
    externalStatus: 'open',
    workflowStatus: 'applied',
    notes: 'Demo seed example showing pipeline stage tracking.',
    discoveredAt: relativeIsoDate(-7),
    source: 'seed',
    provenance: {
      sourceId: 'demo-seed',
      sourceName: 'Demo Seed (Unverified Example)',
      sourceUrl: 'https://digital-strategy.ec.europa.eu',
      discoveredAt: relativeIsoDate(-7),
      verificationStatus: 'demo',
    },
  },
  {
    id: 'seed-nordic-iot-contract',
    title: 'Senior AI Systems & Edge Telemetry Architect (Demo Example)',
    organization: 'Nordic Grid Labs',
    category: 'Recruitment & Contracting',
    location: 'Stockholm / Hybrid or Remote Sweden',
    url: 'https://arbetsformedlingen.se',
    summary:
      'Illustrative demo seed: 3-month technical architecture engagement building deterministic anomaly detection and LLM-assisted root-cause debugging for IoT sensor fleets.',
    compensation: '950–1,150 SEK/hr',
    tags: ['sweden', 'iot', 'typescript', 'python', 'debugging', 'telemetry'],
    externalStatus: 'open',
    workflowStatus: 'saved',
    discoveredAt: relativeIsoDate(-4),
    source: 'seed',
    provenance: {
      sourceId: 'demo-seed',
      sourceName: 'Demo Seed (Unverified Example)',
      sourceUrl: 'https://arbetsformedlingen.se',
      discoveredAt: relativeIsoDate(-4),
      verificationStatus: 'demo',
    },
  },
  {
    id: 'seed-us-onsite-redteam',
    title: 'On-Site Frontier Model Red Team Engineer (Demo Exclusion Example)',
    organization: 'Bay Area Safety Institute',
    category: 'Recruitment & Contracting',
    location: 'On-site San Francisco (US citizen only)',
    url: 'https://example.com/bay-area-redteam',
    summary:
      'Illustrative demo seed demonstrating hard geographic exclusion gating for roles requiring on-site San Francisco presence and US citizenship.',
    compensation: '$210k/yr',
    tags: ['llm', 'evaluation', 'failure analysis'],
    externalStatus: 'open',
    workflowStatus: 'new',
    discoveredAt: relativeIsoDate(-2),
    source: 'seed',
    provenance: {
      sourceId: 'demo-seed',
      sourceName: 'Demo Seed (Unverified Example)',
      discoveredAt: relativeIsoDate(-2),
      verificationStatus: 'demo',
    },
  },
];

export function getSeedOpportunities(profile: DeveloperProfile = INITIAL_PROFILE): Opportunity[] {
  const placeholder: Opportunity[] = RAW_SEED_OPPORTUNITIES.map((item) => ({
    ...item,
    score: 0,
    opportunityQuality: 0,
    eligibility: 'requires_verification',
    eligibilityReason: '',
    deadlineUrgency: 'open',
    applicationEffort: 'medium',
    expectedValue: 'standard',
    projectMatches: [],
    scoreBreakdown: { skills: 0, eligibility: 0, preference: 0, technical: 0, urgency: 0 },
    matchedSignals: [],
    missingChecks: [],
    nextAction: '',
    rationale: '',
  }));
  return rescoreAllOpportunities(placeholder, profile);
}
