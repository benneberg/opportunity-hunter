import React, {useMemo, useState} from 'react';
import {Edit3, ExternalLink, FileJson, Plus, Search, SlidersHorizontal} from 'lucide-react';
import type {
  EligibilityStatus,
  ExternalStatus,
  Opportunity,
  OpportunityCategory,
  WorkflowStatus,
} from '../types';
import {
  EXTERNAL_STATUSES,
  OPPORTUNITY_CATEGORIES,
  WORKFLOW_STATUSES,
} from '../lib/scoring';
import {
  eligibilityTextClass,
  externalStatusTextClass,
  formatEligibilityLabel,
  formatExternalStatus,
  formatWorkflowStatus,
  scoreTextClass,
} from '../lib/format';

interface OpportunitiesViewProps {
  opportunities: Opportunity[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onEditOpportunity: (opp: Opportunity) => void;
  onOpenAddModal: (initialMode: 'single' | 'json') => void;
  onUpdateWorkflow: (id: string, status: WorkflowStatus) => void;
}

export const OpportunitiesView: React.FC<OpportunitiesViewProps> = ({
  opportunities,
  onSelectOpportunity,
  onEditOpportunity,
  onOpenAddModal,
  onUpdateWorkflow,
}) => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | OpportunityCategory>('all');
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | EligibilityStatus>('all');
  const [externalFilter, setExternalFilter] = useState<'all' | ExternalStatus>('all');
  const [workflowFilter, setWorkflowFilter] = useState<'all_active' | 'all' | WorkflowStatus>('all_active');
  const [sortBy, setSortBy] = useState<'score' | 'recent' | 'deadline'>('score');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return opportunities
      .filter((opp) => {
        if (workflowFilter === 'all_active' && opp.workflowStatus === 'dismissed') return false;
        if (
          workflowFilter !== 'all_active' &&
          workflowFilter !== 'all' &&
          opp.workflowStatus !== workflowFilter
        ) {
          return false;
        }
        if (categoryFilter !== 'all' && opp.category !== categoryFilter) return false;
        if (eligibilityFilter !== 'all' && opp.eligibility !== eligibilityFilter) return false;
        if (externalFilter !== 'all' && opp.externalStatus !== externalFilter) return false;
        if (!q) return true;
        const hay = [
          opp.title,
          opp.organization,
          opp.category,
          opp.location,
          opp.summary,
          opp.tags.join(' '),
          opp.matchedSignals.join(' '),
        ]
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (sortBy === 'score') return b.score - a.score;
        if (sortBy === 'deadline') {
          if (!a.deadline && !b.deadline) return b.score - a.score;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return a.deadline.localeCompare(b.deadline);
        }
        return b.discoveredAt.localeCompare(a.discoveredAt);
      });
  }, [opportunities, search, categoryFilter, eligibilityFilter, externalFilter, workflowFilter, sortBy]);

  return (
    <div className="space-y-5">
      {/* Toolbar & Filters */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, organization, skill signal, or location..."
              aria-label="Search opportunities"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onOpenAddModal('json')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
            >
              <FileJson className="w-3.5 h-3.5" />
              <span>Paste JSON</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenAddModal('single')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Entry</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          <select
            aria-label="Filter by category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as 'all' | OpportunityCategory)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All categories</option>
            {OPPORTUNITY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by eligibility"
            value={eligibilityFilter}
            onChange={(e) => setEligibilityFilter(e.target.value as 'all' | EligibilityStatus)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All eligibility</option>
            <option value="confirmed_eligible">Confirmed Eligible</option>
            <option value="likely_eligible">Likely Eligible</option>
            <option value="uncertain">Uncertain Eligibility</option>
            <option value="ineligible">Ineligible</option>
          </select>

          <select
            aria-label="Filter by external status"
            value={externalFilter}
            onChange={(e) => setExternalFilter(e.target.value as 'all' | ExternalStatus)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All external states</option>
            {EXTERNAL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {formatExternalStatus(st)}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by workflow stage"
            value={workflowFilter}
            onChange={(e) =>
              setWorkflowFilter(e.target.value as 'all_active' | 'all' | WorkflowStatus)
            }
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all_active">Active (hide dismissed)</option>
            <option value="all">All workflow stages</option>
            {WORKFLOW_STATUSES.map((st) => (
              <option key={st} value={st}>
                {formatWorkflowStatus(st)}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              aria-label="Sort opportunities"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'score' | 'recent' | 'deadline')}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="score">Sort: Highest fit score</option>
              <option value="deadline">Sort: Soonest deadline</option>
              <option value="recent">Sort: Newly discovered</option>
            </select>
          </div>
        </div>
      </section>

      {/* Result Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span className="font-mono tabular-nums">
          Showing {filtered.length} of {opportunities.length} tracked opportunities
        </span>
      </div>

      {/* Opportunity List */}
      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {filtered.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No opportunities match the active filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoryFilter('all');
                setEligibilityFilter('all');
                setExternalFilter('all');
                setWorkflowFilter('all_active');
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((opp) => (
              <article
                key={opp.id}
                className="p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/25 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <button
                        type="button"
                        onClick={() => onSelectOpportunity(opp)}
                        className="text-left text-base font-semibold text-slate-900 hover:text-sky-700 dark:text-slate-100 dark:hover:text-sky-300 transition-colors"
                      >
                        {opp.title}
                      </button>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        — {opp.organization}
                      </span>
                    </div>

                    {/* Zero-pill inline metadata */}
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>{opp.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{opp.location}</span>
                      {opp.compensation && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono text-slate-700 dark:text-slate-300">
                            {opp.compensation}
                          </span>
                        </>
                      )}
                      {opp.deadline && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">Due {opp.deadline}</span>
                        </>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                      <span className={`font-medium ${eligibilityTextClass(opp.eligibility)}`}>
                        {formatEligibilityLabel(opp.eligibility)}
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                        /
                      </span>
                      <span className={`font-medium ${externalStatusTextClass(opp.externalStatus)}`}>
                        Listing: {formatExternalStatus(opp.externalStatus)}
                      </span>
                      <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
                        /
                      </span>
                      <span className="text-slate-700 dark:text-slate-300">
                        Stage: {formatWorkflowStatus(opp.workflowStatus)}
                      </span>
                    </div>

                    {opp.summary && (
                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                        {opp.summary}
                      </p>
                    )}

                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {opp.rationale}
                    </p>
                  </div>

                  {/* Right Score & Action Column */}
                  <div className="flex md:flex-col items-center md:items-end justify-between gap-3 shrink-0">
                    <div className="text-left md:text-right">
                      <div className="flex items-baseline gap-1 md:justify-end">
                        <span
                          className={`font-mono text-2xl font-semibold tabular-nums ${scoreTextClass(
                            opp.score,
                            opp.eligibility
                          )}`}
                        >
                          {opp.score}
                        </span>
                        <span className="font-mono text-xs text-slate-400">/100</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        S:{opp.scoreBreakdown.skills} · E:{opp.scoreBreakdown.eligibility} · T:{opp.scoreBreakdown.technical}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {opp.url && (
                        <a
                          href={opp.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onEditOpportunity(opp)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      {opp.workflowStatus !== 'saved' && (
                        <button
                          type="button"
                          onClick={() => onUpdateWorkflow(opp.id, 'saved')}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                        >
                          Save
                        </button>
                      )}
                      {opp.workflowStatus !== 'applied' && opp.eligibility !== 'ineligible' && (
                        <button
                          type="button"
                          onClick={() => onUpdateWorkflow(opp.id, 'applied')}
                          className="rounded-md border border-sky-600/30 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 dark:border-sky-400/30 dark:bg-sky-500/10 dark:text-sky-300 dark:hover:bg-sky-500/20 whitespace-nowrap"
                        >
                          Mark Applied
                        </button>
                      )}
                      {opp.workflowStatus !== 'dismissed' && (
                        <button
                          type="button"
                          onClick={() => onUpdateWorkflow(opp.id, 'dismissed')}
                          className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-700 hover:border-rose-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:text-rose-400 whitespace-nowrap"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
