import React, {useState} from 'react';
import {ExternalLink} from 'lucide-react';
import type {ExternalStatus, Opportunity, WorkflowStatus} from '../types';
import {EXTERNAL_STATUSES, WORKFLOW_STATUSES} from '../lib/scoring';
import {
  eligibilityTextClass,
  externalStatusTextClass,
  formatEligibilityLabel,
  formatExternalStatus,
  formatWorkflowStatus,
  scoreTextClass,
} from '../lib/format';

interface PipelineViewProps {
  opportunities: Opportunity[];
  onUpdateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  onSelectOpportunity: (opp: Opportunity) => void;
}

const STAGE_GROUPS: Array<{label: string; stages: WorkflowStatus[]}> = [
  {label: 'Active Preparation', stages: ['saved', 'preparing']},
  {label: 'Submitted & Interviewing', stages: ['applied', 'interview']},
  {label: 'Inbox (New)', stages: ['new']},
  {label: 'Outcomes & Archive', stages: ['accepted', 'rejected', 'dismissed']},
];

export const PipelineView: React.FC<PipelineViewProps> = ({
  opportunities,
  onUpdateOpportunity,
  onSelectOpportunity,
}) => {
  const [selectedStage, setSelectedStage] = useState<'active' | WorkflowStatus>('active');
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');

  const visibleItems = opportunities
    .filter((opp) => {
      if (selectedStage === 'active') {
        return ['saved', 'preparing', 'applied', 'interview', 'accepted'].includes(
          opp.workflowStatus
        );
      }
      return opp.workflowStatus === selectedStage;
    })
    .sort((a, b) => b.score - a.score);

  const stageCount = (st: WorkflowStatus) =>
    opportunities.filter((o) => o.workflowStatus === st).length;

  const activeTotal = opportunities.filter((o) =>
    ['saved', 'preparing', 'applied', 'interview', 'accepted'].includes(o.workflowStatus)
  ).length;

  return (
    <div className="space-y-6">
      {/* Stage Selector Bar */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Personal Application Pipeline
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              External listing status is tracked separately from your personal workflow stage.
            </p>
          </div>
          <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
            {activeTotal} active in pipeline
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-lg dark:bg-slate-800/80">
          <button
            type="button"
            onClick={() => setSelectedStage('active')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              selectedStage === 'active'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            Active Pipeline ({activeTotal})
          </button>
          {WORKFLOW_STATUSES.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setSelectedStage(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                selectedStage === st
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {formatWorkflowStatus(st)} ({stageCount(st)})
            </button>
          ))}
        </div>
      </section>

      {/* Pipeline Table / Cards */}
      <section className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        {visibleItems.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No opportunities in this pipeline stage.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Move items from Opportunities into Saved or Preparing to manage deadlines and notes here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {visibleItems.map((opp) => {
              const isEditingNote = editingNotesId === opp.id;
              return (
                <article key={opp.id} className="p-5 space-y-3">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <button
                          type="button"
                          onClick={() => onSelectOpportunity(opp)}
                          className="text-left text-sm font-semibold text-slate-900 hover:text-sky-700 dark:text-slate-100 dark:hover:text-sky-300"
                        >
                          {opp.title}
                        </button>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          — {opp.organization}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className={`font-mono font-semibold tabular-nums ${scoreTextClass(opp.score, opp.eligibility)}`}>
                          {opp.score}/100
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className={eligibilityTextClass(opp.eligibility)}>
                          {formatEligibilityLabel(opp.eligibility)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{opp.location}</span>
                        {opp.url && (
                          <>
                            <span aria-hidden="true">·</span>
                            <a
                              href={opp.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sky-700 hover:underline dark:text-sky-400"
                            >
                              <span>Listing</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Controls: Deadline, External Status, Workflow Status */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <span>Deadline</span>
                        <input
                          type="date"
                          value={opp.deadline || ''}
                          onChange={(e) =>
                            onUpdateOpportunity(opp.id, {
                              deadline: e.target.value || undefined,
                            })
                          }
                          className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                        />
                      </label>

                      <select
                        aria-label={`External status for ${opp.title}`}
                        value={opp.externalStatus}
                        onChange={(e) =>
                          onUpdateOpportunity(opp.id, {
                            externalStatus: e.target.value as ExternalStatus,
                          })
                        }
                        className={`rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 ${externalStatusTextClass(
                          opp.externalStatus
                        )}`}
                      >
                        {EXTERNAL_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            Ext: {formatExternalStatus(st)}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label={`Workflow stage for ${opp.title}`}
                        value={opp.workflowStatus}
                        onChange={(e) =>
                          onUpdateOpportunity(opp.id, {
                            workflowStatus: e.target.value as WorkflowStatus,
                          })
                        }
                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {WORKFLOW_STATUSES.map((st) => (
                          <option key={st} value={st}>
                            Stage: {formatWorkflowStatus(st)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="pt-1">
                    {isEditingNote ? (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={draftNote}
                          onChange={(e) => setDraftNote(e.target.value)}
                          placeholder="Add preparation notes, portfolio angle, or application status log..."
                          className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateOpportunity(opp.id, {notes: draftNote.trim() || undefined});
                              setEditingNotesId(null);
                            }}
                            className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
                          >
                            Save Note
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingNotesId(null)}
                            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-baseline justify-between gap-4">
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {opp.notes ? (
                            <span>Note: {opp.notes}</span>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">
                              No personal notes recorded yet.
                            </span>
                          )}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftNote(opp.notes || '');
                            setEditingNotesId(opp.id);
                          }}
                          className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-400 whitespace-nowrap shrink-0"
                        >
                          {opp.notes ? 'Edit Note' : 'Add Note'}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Stage Distribution Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGE_GROUPS.map((group) => {
          const count = group.stages.reduce((acc, st) => acc + stageCount(st), 0);
          return (
            <div
              key={group.label}
              className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {group.label}
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                {count}
              </p>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {group.stages.map(formatWorkflowStatus).join(' · ')}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
};
