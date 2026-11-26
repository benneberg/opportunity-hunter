import type {DeveloperProfile, Opportunity} from '../types';
import {DEFAULT_WEIGHTS, rescoreAllOpportunities} from './scoring';

export const INITIAL_PROFILE: DeveloperProfile = {
  name: 'Independent AI Systems Developer',
  positioning:
    'AI systems development, model evaluation, and human-in-the-loop failure analysis — independent builder shipping developer tooling and diagnosing model failure modes.',
  primaryLocation: 'Sweden',
  skills: [
    'llm',
    'evaluation',
    'agents',
    'typescript',
    'python',
    'iot',
    'debugging',
    'ast',
    'developer-tooling',
    'failure-analysis',
    'hitl',
    'benchmark',
  ],
  preferredLocations: ['Sweden', 'Stockholm', 'Nordic', 'Europe', 'EU', 'Remote', 'International', 'Global'],
  blockedLocations: ['US-only', 'US citizen only', 'On-site San Francisco', 'On-site New York'],
  preferredCategories: [
    'Research & Model Evaluation',
    'Recruitment & Contracting',
    'Early Access & Credits',
    'Grants & Competitions',
  ],
  flagshipProjects: [
    {
      id: 'proj-contextcompiler',
      name: 'ContextCompiler',
      focus: 'AST-aware context packing, deterministic code-graph indexing, and developer tooling.',
      keywords: ['ast', 'compiler', 'context', 'developer-tooling', 'typescript', 'code'],
    },
    {
      id: 'proj-lena',
      name: 'Lena AI 2.0',
      focus: 'Multi-step agent orchestration, tool-use evaluation, and failure-mode diagnostics.',
      keywords: ['agents', 'llm', 'evaluation', 'failure', 'orchestration', 'hitl'],
    },
    {
      id: 'proj-minicodi',
      name: 'MiniCodi',
      focus: 'Lightweight autonomous coding assistant and automated patch verification harness.',
      keywords: ['coding', 'debugging', 'patch', 'eval', 'python', 'typescript'],
    },
    {
      id: 'proj-insikt',
      name: 'INSIKT',
      focus: 'IoT telemetry analysis, anomaly detection, and structured operational insight pipelines.',
      keywords: ['iot', 'telemetry', 'analysis', 'systems', 'monitoring', 'sweden'],
    },
  ],
  weights: { ...DEFAULT_WEIGHTS },
};

function relativeIsoDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const RAW_SEED_OPPORTUNITIES: Array<
  Omit<
    Opportunity,
    'score' | 'eligibility' | 'scoreBreakdown' | 'matchedSignals' | 'missingChecks' | 'nextAction' | 'rationale'
  >
> = [
  {
    id: 'seed-alignerr',
    title: 'Technical AI Model Evaluator & Coding Trainer',
    organization: 'Alignerr',
    category: 'Research & Model Evaluation',
    location: 'Remote / Sweden supported (Contractor)',
    url: 'https://www.alignerr.com',
    summary:
      'Evaluate LLM code reasoning, AST/debugging accuracy, agent tool-use trajectories, and failure-mode rubrics across TypeScript and Python.',
    compensation: '$45–$75/hr contractor',
    tags: ['llm', 'evaluation', 'agents', 'typescript', 'python', 'debugging'],
    externalStatus: 'open',
    workflowStatus: 'saved',
    notes: 'Strong fit for MiniCodi and ContextCompiler coding evaluation background.',
    discoveredAt: relativeIsoDate(-3),
    source: 'seed',
  },
  {
    id: 'seed-prolific',
    title: 'AI & Human-in-the-Loop Model Evaluation Studies',
    organization: 'Prolific',
    category: 'Research & Model Evaluation',
    location: 'Remote / Sweden confirmed',
    url: 'https://www.prolific.com',
    summary:
      'Specialized human-in-the-loop model evaluation, safety preference ranking, and technical failure-analysis benchmarks for academic and frontier AI labs.',
    compensation: '£12–£35/hr per study',
    tags: ['evaluation', 'hitl', 'research', 'sweden', 'benchmark'],
    externalStatus: 'open',
    workflowStatus: 'new',
    discoveredAt: relativeIsoDate(-2),
    source: 'seed',
  },
  {
    id: 'seed-vinnova-ai',
    title: 'Applied AI Systems & Industrial Tooling Grant',
    organization: 'Vinnova (Sweden Innovation Agency)',
    category: 'Grants & Competitions',
    location: 'Sweden (Stockholm / Remote Sweden)',
    url: 'https://www.vinnova.se',
    summary:
      'Funding call for independent Swedish builders and small R&D teams shipping verifiable AI systems, IoT telemetry diagnostics, and developer infrastructure.',
    compensation: 'Up to 500,000 SEK grant',
    deadline: relativeIsoDate(9),
    tags: ['sweden', 'iot', 'systems', 'grant', 'evaluation'],
    externalStatus: 'closing_soon',
    workflowStatus: 'preparing',
    notes: 'Check Swedish entity / sole proprietorship requirements before finalizing INSIKT abstract.',
    discoveredAt: relativeIsoDate(-5),
    source: 'seed',
  },
  {
    id: 'seed-anthropic-credits',
    title: 'Frontier Model Evaluation & Safety Research API Credits',
    organization: 'Anthropic External Researcher Program',
    category: 'Early Access & Credits',
    location: 'Remote / International (Sweden eligible)',
    url: 'https://www.anthropic.com',
    summary:
      'API compute credits and early evaluation harness access for independent researchers building deterministic agent failure-analysis and benchmark suites.',
    compensation: '$5,000–$25,000 API credits',
    deadline: relativeIsoDate(12),
    tags: ['llm', 'evaluation', 'agents', 'benchmark', 'failure-analysis', 'sweden'],
    externalStatus: 'closing_soon',
    workflowStatus: 'new',
    discoveredAt: relativeIsoDate(-1),
    source: 'seed',
  },
  {
    id: 'seed-eu-ai-benchmark',
    title: 'European Open-Source Agent Reliability Fellowship',
    organization: 'EuroAI Commons',
    category: 'Community & Fellowships',
    location: 'Europe / Remote',
    url: 'https://digital-strategy.ec.europa.eu',
    summary:
      '6-month remote fellowship supporting open-source AST tooling, deterministic eval harnesses, and reproducible agent debugging benchmarks.',
    compensation: '€3,500/mo stipend',
    deadline: relativeIsoDate(28),
    tags: ['ast', 'developer-tooling', 'agents', 'evaluation', 'europe'],
    externalStatus: 'open',
    workflowStatus: 'applied',
    notes: 'Submitted ContextCompiler + Lena AI 2.0 technical portfolio link.',
    discoveredAt: relativeIsoDate(-7),
    source: 'seed',
  },
  {
    id: 'seed-nordic-iot-contract',
    title: 'Senior AI Systems & Edge Telemetry Architect (Contract)',
    organization: 'Nordic Grid Labs',
    category: 'Recruitment & Contracting',
    location: 'Stockholm / Hybrid or Remote Sweden',
    url: 'https://arbetsformedlingen.se',
    summary:
      '3-month technical architecture engagement building deterministic anomaly detection and LLM-assisted root-cause debugging for IoT sensor fleets.',
    compensation: '950–1,150 SEK/hr',
    tags: ['sweden', 'iot', 'typescript', 'python', 'debugging', 'systems'],
    externalStatus: 'open',
    workflowStatus: 'saved',
    discoveredAt: relativeIsoDate(-4),
    source: 'seed',
  },
  {
    id: 'seed-us-onsite-redteam',
    title: 'On-Site Frontier Model Red Team Engineer',
    organization: 'Bay Area Safety Institute',
    category: 'Recruitment & Contracting',
    location: 'On-site San Francisco (US citizen only)',
    url: 'https://example.com/bay-area-redteam',
    summary:
      'Full-time in-person evaluation and failure-mode red-teaming role requiring on-site San Francisco presence and US work authorization.',
    compensation: '$210k/yr',
    tags: ['llm', 'evaluation', 'failure-analysis'],
    externalStatus: 'open',
    workflowStatus: 'new',
    discoveredAt: relativeIsoDate(-2),
    source: 'seed',
  },
];

export function getSeedOpportunities(profile: DeveloperProfile = INITIAL_PROFILE): Opportunity[] {
  const placeholder: Opportunity[] = RAW_SEED_OPPORTUNITIES.map((item) => ({
    ...item,
    score: 0,
    eligibility: 'uncertain',
    scoreBreakdown: { skills: 0, eligibility: 0, preference: 0, technical: 0, urgency: 0 },
    matchedSignals: [],
    missingChecks: [],
    nextAction: '',
    rationale: '',
  }));
  return rescoreAllOpportunities(placeholder, profile);
}
