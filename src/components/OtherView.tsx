import {useState} from 'react';
import {ExternalLink, Plus, Trash2} from 'lucide-react';
import type {Opportunity, ResourceLink, WorkflowStatus} from '../types';
import {otherReason} from '../lib/buckets';

interface Props {
  opportunities: Opportunity[];
  resources: ResourceLink[];
  onSelectOpportunity: (opp: Opportunity) => void;
  onUpdateWorkflow: (id: string, status: WorkflowStatus) => void;
  onAddResource: (link: Omit<ResourceLink, 'id' | 'source'>) => void;
  onRemoveResource: (id: string) => void;
}

const RESOURCE_TYPES = ['company', 'platform', 'job board', 'recruiter', 'community', 'competition', 'other'];
const card = 'rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900';
const input =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800';
const isHttp = (u: string) => /^https?:\/\//i.test(u);

export default function OtherView({
  opportunities,
  resources,
  onSelectOpportunity,
  onUpdateWorkflow,
  onAddResource,
  onRemoveResource,
}: Props) {
  const [form, setForm] = useState({name: '', url: '', type: 'platform', note: ''});
  const [formError, setFormError] = useState('');

  const others = opportunities
    .map((o) => ({o, reason: otherReason(o)}))
    .filter((x): x is {o: Opportunity; reason: string} => x.reason !== null)
    .sort((a, b) => b.o.score - a.o.score);
  const announcements = others.filter((x) => x.o.itemType === 'announcement');
  const weak = others.filter((x) => x.o.itemType !== 'announcement');

  const submit = () => {
    if (!form.name.trim() || !isHttp(form.url.trim())) {
      setFormError('Enter a name and a URL starting with http:// or https://');
      return;
    }
    onAddResource({name: form.name.trim(), url: form.url.trim(), type: form.type, note: form.note.trim()});
    setForm({name: '', url: '', type: 'platform', note: ''});
    setFormError('');
  };

  const row = ({o, reason}: {o: Opportunity; reason: string}) => (
    <div key={o.id} className={`${card} flex items-start gap-3`}>
      <button type="button" onClick={() => onSelectOpportunity(o)} className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{o.title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {o.organization} · {o.category}
        </p>
        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">{reason}</p>
      </button>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="font-mono text-sm tabular-nums text-slate-700 dark:text-slate-200">{o.score}</span>
        <button
          type="button"
          onClick={() => onUpdateWorkflow(o.id, o.workflowStatus === 'dismissed' ? 'new' : 'saved')}
          className="text-[11px] font-medium text-sky-600 hover:underline dark:text-sky-400"
        >
          {o.workflowStatus === 'dismissed' ? 'Restore' : 'Move to my list'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-6">
      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-2xl">
        Everything AI-related is listed. Weaker matches, items that look closed to you, announcements and useful
        links are kept here, so nothing is hidden and nothing is deleted.
      </p>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Other opportunities ({weak.length})
        </h2>
        {weak.length === 0 && <p className="text-xs text-slate-500">Nothing here yet.</p>}
        {weak.map(row)}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Announcements and news ({announcements.length})
        </h2>
        {announcements.length === 0 && <p className="text-xs text-slate-500">Nothing here yet.</p>}
        {announcements.map(row)}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Links and resources ({resources.length})
        </h2>
        <div className={`${card} grid gap-2 sm:grid-cols-2`}>
          <input className={input} placeholder="Name" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
          <input className={input} placeholder="https://" value={form.url} onChange={(e) => setForm({...form, url: e.target.value})} />
          <select className={input} value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}>
            {RESOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input className={input} placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({...form, note: e.target.value})} />
          <div className="sm:col-span-2 flex items-center gap-3">
            <button
              type="button"
              onClick={submit}
              className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add link
            </button>
            {formError && <span className="text-xs text-rose-600">{formError}</span>}
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {resources.map((r) => (
            <div key={r.id} className={`${card} flex items-start gap-2`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{r.name}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {r.type}
                  {r.note ? ` · ${r.note}` : ''}
                </p>
              </div>
              {isHttp(r.url) && (
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Open ${r.name}`}
                  className="text-sky-600 dark:text-sky-400"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
              {r.source === 'user' && (
                <button type="button" aria-label={`Remove ${r.name}`} onClick={() => onRemoveResource(r.id)} className="text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
