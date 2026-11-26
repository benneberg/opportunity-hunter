import React from 'react';
import {Edit3, ExternalLink, Trash2, X} from 'lucide-react';
import type {DeveloperProfile, ExternalStatus, Opportunity, WorkflowStatus} from '../types';
import {EXTERNAL_STATUSES, WORKFLOW_STATUSES} from '../lib/scoring';
import {
  eligibilityTextClass,
  externalStatusTextClass,
  formatEffortLabel,
  formatEligibilityLabel,
  formatExpectedValue,
  formatExternalStatus,
  formatVerificationLabel,
  formatWorkflowStatus,
  scoreTextClass,
  verificationTextClass,
} from '../lib/format';

interface OpportunityDetailDrawerProps {
  opportunity: Opportunity | null;
  profile: DeveloperProfile;
  onClose: () => void;
  onEdit: (opp: Opportunity) => void;
  onDelete: (id: string) => void;
  onUpdateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
}

export const OpportunityDetailDrawer: React.FC<OpportunityDetailDrawerProps> = ({
  opportunity,
  profile,
  onClose,
  onEdit,
  onDelete,
  onUpdateOpportunity,
}) => {
  if (!opportunity) return null;

  const weightSum =
    profile.weights.skills +
    profile.weights.eligibility +
    profile.weights.preference +
    profile.weights.technical +
    profile.weights.urgency || 100;

  const maxDim = (w: number) => Math.max(1, Math.round((w / weightSum) * 100));

  const breakdownRows = [
    {
      label: 'Skill & Project Overlap',
      earned: opportunity.scoreBreakdown.skills,
      max: maxDim(profile.weights.skills),
    },
    {
      label: 'Eligibility & Location',
      earned: opportunity.scoreBreakdown.eligibility,
      max: maxDim(profile.weights.eligibility),
    },
    {
      label: 'Category & Benefit Fit',
      earned: opportunity.scoreBreakdown.preference,
      max: maxDim(profile.weights.preference),
    },
    {
      label: 'AI Systems Depth',
      earned: opportunity.scoreBreakdown.technical,
      max: maxDim(profile.weights.technical),
    },
    {
      label: 'Deadline & Effort Fit',
      earned: opportunity.scoreBreakdown.urgency,
      max: maxDim(profile.weights.urgency),
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Inspect ${opportunity.title}`}
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full overflow-y-auto border-l border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {opportunity.organization} · {opportunity.category}
            </p>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {opportunity.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail panel"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          {/* Top Summary & Score */}
          <div className="flex items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
              <p>Location: {opportunity.location}</p>
              {opportunity.compensation && (
                <p className="font-mono">Compensation: {opportunity.compensation}</p>
              )}
              {opportunity.deadline && (
                <p className="font-mono tabular-nums">Deadline: {opportunity.deadline}</p>
              )}
              <p className={`font-medium ${eligibilityTextClass(opportunity.eligibility)}`}>
                {formatEligibilityLabel(opportunity.eligibility)}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Effort: {formatEffortLabel(opportunity.applicationEffort)} · Value:{' '}
                {formatExpectedValue(opportunity.expectedValue)}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500 dark:text-slate-400">Composite Score</p>
              <p
                className={`font-mono text-3xl font-semibold tabular-nums ${scoreTextClass(
                  opportunity.score,
                  opportunity.eligibility
                )}`}
              >
                {opportunity.score}
                <span className="text-sm text-slate-400">/100</span>
              </p>
              <p className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                Quality {opportunity.opportunityQuality}/100
              </p>
            </div>
          </div>

          {/* Eligibility & Provenance */}
          <section className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Source &amp; Provenance
              </span>
              <span className={`font-medium ${verificationTextClass(opportunity.provenance?.verificationStatus)}`}>
                {formatVerificationLabel(opportunity.provenance?.verificationStatus)}
              </span>
            </div>
            <div className="text-slate-600 dark:text-slate-300 space-y-0.5 font-mono text-[11px]">
              <p>Source: {opportunity.provenance?.sourceName || opportunity.source || 'Unknown'}</p>
              <p>
                Discovered: {opportunity.provenance?.discoveredAt || opportunity.discoveredAt}
                {opportunity.provenance?.lastVerifiedAt
                  ? ` · Verified: ${new Date(opportunity.provenance.lastVerifiedAt).toLocaleString()}`
                  : ''}
              </p>
            </div>
            {opportunity.eligibilityReason && (
              <p className="text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200 dark:border-slate-800">
                Eligibility rationale: {opportunity.eligibilityReason}
              </p>
            )}
          </section>

          {/* Explainable Score Breakdown */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Deterministic Score Breakdown
            </h3>
            <div className="space-y-2.5">
              {breakdownRows.map((row) => {
                const pct = Math.min(100, Math.round((row.earned / row.max) * 100));
                return (
                  <div key={row.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 dark:text-slate-300">{row.label}</span>
                      <span className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                        {row.earned} / {row.max}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-sky-600 dark:bg-sky-400"
                        style={{width: `${pct}%`}}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Project-Specific Relevance */}
          {opportunity.projectMatches && opportunity.projectMatches.length > 0 && (
            <section className="space-y-2 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Flagship Project Relevance
              </p>
              <div className="space-y-1.5">
                {opportunity.projectMatches.map((pm) => (
                  <div
                    key={pm.projectName}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <p className="font-semibold text-sky-700 dark:text-sky-400">
                      {pm.projectName}{' '}
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        ({pm.strength} relevance)
                      </span>
                    </p>
                    <p className="text-slate-600 dark:text-slate-300 mt-0.5">{pm.reason}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Signals & Checks */}
          <section className="space-y-3 text-xs">
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">Matched Signals</p>
              <p className="mt-1 font-mono text-slate-600 dark:text-slate-400">
                {opportunity.matchedSignals.length > 0
                  ? opportunity.matchedSignals.join(' · ')
                  : 'No direct profile keyword hits'}
              </p>
            </div>

            {opportunity.missingChecks.length > 0 && (
              <div>
                <p className="font-semibold text-amber-700 dark:text-amber-400">
                  Missing / Uncertain Checks
                </p>
                <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
                  {opportunity.missingChecks.map((chk) => (
                    <li key={chk}>{chk}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                Recommended Next Action
              </p>
              <p className="mt-1 text-slate-600 dark:text-slate-300">{opportunity.nextAction}</p>
            </div>
          </section>

          {/* Description */}
          {opportunity.summary && (
            <section className="space-y-1.5">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Summary</p>
              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {opportunity.summary}
              </p>
            </section>
          )}

          {/* Status Controls */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>External Listing Status</span>
              <select
                value={opportunity.externalStatus}
                onChange={(e) =>
                  onUpdateOpportunity(opportunity.id, {
                    externalStatus: e.target.value as ExternalStatus,
                  })
                }
                className={`w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 ${externalStatusTextClass(
                  opportunity.externalStatus
                )}`}
              >
                {EXTERNAL_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {formatExternalStatus(st)}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Personal Workflow Stage</span>
              <select
                value={opportunity.workflowStatus}
                onChange={(e) =>
                  onUpdateOpportunity(opportunity.id, {
                    workflowStatus: e.target.value as WorkflowStatus,
                  })
                }
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {WORKFLOW_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {formatWorkflowStatus(st)}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {opportunity.notes && (
            <section className="space-y-1 text-xs">
              <p className="font-semibold text-slate-700 dark:text-slate-300">Personal Notes</p>
              <p className="text-slate-600 dark:text-slate-300">{opportunity.notes}</p>
            </section>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              onDelete(opportunity.id);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(opportunity)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit</span>
            </button>
            {opportunity.url && (
              <a
                href={opportunity.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                <span>Open Listing</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
