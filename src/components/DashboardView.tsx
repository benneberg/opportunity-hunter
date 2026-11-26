import React from 'react';
import {ArrowRight, ExternalLink, RefreshCw} from 'lucide-react';
import type {ActiveTab, Opportunity, WorkflowStatus} from '../types';
import {
  eligibilityTextClass,
  externalStatusTextClass,
  formatEligibilityLabel,
  formatExternalStatus,
  formatWorkflowStatus,
  scoreTextClass,
} from '../lib/format';
import {daysUntilDeadline} from '../lib/scoring';

interface DashboardViewProps {
  opportunities: Opportunity[];
  lastFeedSync: string | null;
  isSyncing: boolean;
  syncFeedback: string | null;
  onSyncFeed: () => void;
  onNavigate: (tab: ActiveTab) => void;
  onSelectOpportunity: (opp: Opportunity) => void;
  onUpdateWorkflow: (id: string, status: WorkflowStatus) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  opportunities,
  lastFeedSync,
  isSyncing,
  syncFeedback,
  onSyncFeed,
  onNavigate,
  onSelectOpportunity,
  onUpdateWorkflow,
}) => {
  const activeItems = opportunities.filter((o) => o.workflowStatus !== 'dismissed');
  const newCount = activeItems.filter((o) => o.workflowStatus === 'new').length;
  const strongMatches = activeItems
    .filter((o) => o.score >= 78 && o.eligibility !== 'ineligible' && o.externalStatus !== 'closed')
    .sort((a, b) => b.score - a.score);
  const closingSoon = activeItems
    .filter((o) => o.externalStatus === 'closing_soon')
    .sort((a, b) => (daysUntilDeadline(a.deadline) ?? 99) - (daysUntilDeadline(b.deadline) ?? 99));
  const activePipelineCount = activeItems.filter((o) =>
    ['saved', 'preparing', 'applied', 'interview'].includes(o.workflowStatus)
  ).length;

  const kpis = [
    {label: 'New Leads', value: newCount, sub: 'Awaiting initial triage'},
    {label: 'Strong Matches', value: strongMatches.length, sub: 'Score 78+ and eligible'},
    {label: 'Closing Soon', value: closingSoon.length, sub: 'Within 14-day window'},
    {label: 'Active Pipeline', value: activePipelineCount, sub: 'Saved through interview'},
  ];

  const topMatches = [...activeItems]
    .filter((o) => o.eligibility !== 'ineligible' && o.externalStatus !== 'closed')
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* KPI Strip */}
      <section aria-label="Summary metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{kpi.label}</p>
            <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {kpi.value}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{kpi.sub}</p>
          </div>
        ))}
      </section>

      {/* Main Split: Top Ranked Matches + Priority Queue / Feed Sync */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Top Ranked Matches (2 cols) */}
        <section className="xl:col-span-2 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Top Eligible Matches
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Ranked deterministically across skills, Sweden/remote eligibility, and AI systems depth
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('opportunities')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-sky-700 hover:text-sky-800 dark:text-sky-400 dark:hover:text-sky-300 whitespace-nowrap shrink-0"
            >
              <span>View all</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {topMatches.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                No eligible active matches found. Adjust rules or add a new opportunity.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {topMatches.map((opp) => (
                <article
                  key={opp.id}
                  className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <button
                          type="button"
                          onClick={() => onSelectOpportunity(opp)}
                          className="text-left text-sm font-semibold text-slate-900 hover:text-sky-700 dark:text-slate-100 dark:hover:text-sky-300 transition-colors"
                        >
                          {opp.title}
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          — {opp.organization}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>{opp.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{opp.location}</span>
                        <span aria-hidden="true">·</span>
                        <span className={eligibilityTextClass(opp.eligibility)}>
                          {formatEligibilityLabel(opp.eligibility)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={externalStatusTextClass(opp.externalStatus)}>
                          {formatExternalStatus(opp.externalStatus)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Next action: {opp.nextAction}
                      </p>

                      {opp.missingChecks.length > 0 && (
                        <p className="text-xs text-amber-700 dark:text-amber-400">
                          Verify: {opp.missingChecks.join(' · ')}
                        </p>
                      )}
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-mono text-xl font-semibold tabular-nums ${scoreTextClass(
                            opp.score,
                            opp.eligibility
                          )}`}
                        >
                          {opp.score}
                        </span>
                        <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
                          /100
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {opp.workflowStatus === 'new' && (
                          <button
                            type="button"
                            onClick={() => onUpdateWorkflow(opp.id, 'saved')}
                            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                          >
                            Save
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectOpportunity(opp)}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                        >
                          Inspect
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Closing Soon & Feed Sync */}
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Closing Soon
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Deadlines within the next 14 days
              </p>
            </div>

            {closingSoon.length === 0 ? (
              <div className="p-5 text-xs text-slate-500 dark:text-slate-400">
                No urgent deadlines currently flagged.
              </div>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {closingSoon.map((opp) => {
                  const days = daysUntilDeadline(opp.deadline);
                  return (
                    <div key={opp.id} className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectOpportunity(opp)}
                          className="text-left text-sm font-medium text-slate-900 hover:text-sky-700 dark:text-slate-100 dark:hover:text-sky-300"
                        >
                          {opp.title}
                        </button>
                        <span className="font-mono text-xs font-medium tabular-nums text-amber-700 dark:text-amber-400 shrink-0">
                          {days !== null ? `${days}d left` : 'Soon'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{opp.organization}</span>
                        <span aria-hidden="true">·</span>
                        <span>Stage: {formatWorkflowStatus(opp.workflowStatus)}</span>
                        {opp.url && (
                          <>
                            <span aria-hidden="true">·</span>
                            <a
                              href={opp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sky-700 hover:underline dark:text-sky-400"
                            >
                              <span>Link</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Discovery Feed Sync
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Reads static <code className="font-mono">./data/opportunities.json</code> generated by GitHub Actions.
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 font-mono tabular-nums">
              Last sync: {lastFeedSync ? new Date(lastFeedSync).toLocaleString() : 'Not yet synced'}
            </div>

            {syncFeedback && (
              <p className="text-xs text-sky-700 dark:text-sky-300">{syncFeedback}</p>
            )}

            <button
              type="button"
              onClick={onSyncFeed}
              disabled={isSyncing}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Checking feed...' : 'Check Feed Update'}</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};
