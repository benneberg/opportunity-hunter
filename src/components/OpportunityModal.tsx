import React, {useState} from 'react';
import {X} from 'lucide-react';
import type {
  DeveloperProfile,
  ExternalStatus,
  Opportunity,
  OpportunityCategory,
  WorkflowStatus,
} from '../types';
import {
  EXTERNAL_STATUSES,
  OPPORTUNITY_CATEGORIES,
  WORKFLOW_STATUSES,
  inferExternalStatus,
  parseUntrustedJsonBatch,
  sanitizeText,
  sanitizeUrl,
  scoreOpportunity,
} from '../lib/scoring';
import {formatExternalStatus, formatWorkflowStatus} from '../lib/format';

interface OpportunityModalProps {
  mode: 'single' | 'json';
  editingOpportunity: Opportunity | null;
  profile: DeveloperProfile;
  onClose: () => void;
  onSaveSingle: (opp: Opportunity, isEdit: boolean) => void;
  onImportBatch: (items: Opportunity[]) => void;
}

const SAMPLE_JSON_SNIPPET = `[
  {
    "title": "LLM Agent Evaluation Engineer",
    "organization": "Nordic AI Lab",
    "category": "Research & Model Evaluation",
    "location": "Remote / Sweden",
    "url": "https://example.com/eval-role",
    "compensation": "€85/hr",
    "tags": ["llm", "evaluation", "agents", "typescript"],
    "summary": "Design deterministic failure-mode evaluation suites for autonomous coding agents."
  }
]`;

export const OpportunityModal: React.FC<OpportunityModalProps> = ({
  mode: initialMode,
  editingOpportunity,
  profile,
  onClose,
  onSaveSingle,
  onImportBatch,
}) => {
  const [activeTab, setActiveTab] = useState<'single' | 'json'>(
    editingOpportunity ? 'single' : initialMode
  );

  const [title, setTitle] = useState(editingOpportunity?.title || '');
  const [organization, setOrganization] = useState(editingOpportunity?.organization || '');
  const [category, setCategory] = useState<OpportunityCategory>(
    editingOpportunity?.category || 'Research & Model Evaluation'
  );
  const [location, setLocation] = useState(editingOpportunity?.location || '');
  const [url, setUrl] = useState(editingOpportunity?.url || '');
  const [compensation, setCompensation] = useState(editingOpportunity?.compensation || '');
  const [deadline, setDeadline] = useState(editingOpportunity?.deadline || '');
  const [tagsText, setTagsText] = useState(editingOpportunity?.tags.join(', ') || '');
  const [externalStatus, setExternalStatus] = useState<ExternalStatus>(
    editingOpportunity?.externalStatus || 'open'
  );
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>(
    editingOpportunity?.workflowStatus || 'saved'
  );
  const [summary, setSummary] = useState(editingOpportunity?.summary || '');
  const [notes, setNotes] = useState(editingOpportunity?.notes || '');

  const [jsonInput, setJsonInput] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleSubmitSingle = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = sanitizeText(title, 180);
    const cleanOrg = sanitizeText(organization, 120);
    if (!cleanTitle || !cleanOrg) return;

    const cleanTags = tagsText
      .split(',')
      .map((t) => sanitizeText(t, 40))
      .filter(Boolean);
    const cleanDeadline = deadline.trim() || undefined;
    const effectiveExternal = inferExternalStatus(externalStatus, cleanDeadline);

    const base = {
      id: editingOpportunity?.id || `manual-${Date.now()}`,
      title: cleanTitle,
      organization: cleanOrg,
      category,
      location: sanitizeText(location, 120) || 'Location unspecified',
      url: sanitizeUrl(url),
      compensation: sanitizeText(compensation, 100) || undefined,
      deadline: cleanDeadline,
      tags: cleanTags,
      externalStatus: effectiveExternal,
      workflowStatus,
      summary: sanitizeText(summary, 500),
      notes: sanitizeText(notes, 500) || undefined,
      discoveredAt: editingOpportunity?.discoveredAt || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
      source: editingOpportunity?.source || ('manual' as const),
    };

    const assessment = scoreOpportunity(base, profile);
    onSaveSingle({...base, ...assessment}, Boolean(editingOpportunity));
  };

  const handleSubmitJson = (e: React.FormEvent) => {
    e.preventDefault();
    const {items, error} = parseUntrustedJsonBatch(jsonInput, profile);
    if (error) {
      setJsonError(error);
      return;
    }
    if (items.length === 0) {
      setJsonError('No valid opportunity objects found in JSON input.');
      return;
    }
    setJsonError(null);
    onImportBatch(items);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={editingOpportunity ? 'Edit Opportunity' : 'Add Opportunity'}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden my-8">
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {editingOpportunity ? 'Edit Opportunity' : 'Add Opportunity'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!editingOpportunity && (
          <div className="px-6 pt-4 flex items-center gap-1 p-1">
            <div className="inline-flex p-1 rounded-lg bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('single')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'single'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('json')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'json'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-slate-100'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Paste JSON Batch
              </button>
            </div>
          </div>
        )}

        {activeTab === 'single' ? (
          <form onSubmit={handleSubmitSingle} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Role / Program Title *</span>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Technical AI Model Evaluator"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Organization *</span>
                <input
                  required
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="e.g. Alignerr, Prolific, Vinnova"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Category</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as OpportunityCategory)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {OPPORTUNITY_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Location / Remote Policy</span>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Remote / Sweden supported"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Listing URL</span>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Compensation / Credits / Grant</span>
                <input
                  value={compensation}
                  onChange={(e) => setCompensation(e.target.value)}
                  placeholder="e.g. $60/hr, $10,000 credits"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Deadline</span>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>Tags (comma-separated)</span>
                <input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  placeholder="llm, evaluation, agents, typescript"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </label>

              <label className="space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                <span>External Opportunity Status</span>
                <select
                  value={externalStatus}
                  onChange={(e) => setExternalStatus(e.target.value as ExternalStatus)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
                  value={workflowStatus}
                  onChange={(e) => setWorkflowStatus(e.target.value as WorkflowStatus)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {WORKFLOW_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {formatWorkflowStatus(st)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Summary & Technical Requirements</span>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Scope, evaluation focus, residency rules..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <label className="block space-y-1 text-xs font-medium text-slate-700 dark:text-slate-300">
              <span>Personal Notes</span>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Portfolio angle, contact, next steps..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                {editingOpportunity ? 'Save Changes' : 'Score & Add Opportunity'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitJson} className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Paste a JSON array or <code className="font-mono">{'{"items": [...]}'}</code>. Text is sanitized as untrusted data and scored deterministically.
              </p>
              <button
                type="button"
                onClick={() => setJsonInput(SAMPLE_JSON_SNIPPET)}
                className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-400 whitespace-nowrap shrink-0"
              >
                Load Example
              </button>
            </div>

            <textarea
              rows={9}
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder={SAMPLE_JSON_SNIPPET}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />

            {jsonError && (
              <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{jsonError}</p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                Sanitize, Score & Import
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
