import React, {useState} from 'react';
import {Download, Moon, Plus, RotateCcw, Sun, Trash2, Upload} from 'lucide-react';
import type {DeveloperProfile, FlagshipProject, OpportunityCategory, ScoringWeights} from '../types';
import {DEFAULT_WEIGHTS, OPPORTUNITY_CATEGORIES} from '../lib/scoring';
import {PWAInstallButton} from './PWAInstallButton';

interface ProfileViewProps {
  profile: DeveloperProfile;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSaveProfile: (nextProfile: DeveloperProfile) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onResetAll: () => void;
  backupMessage: string | null;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  theme,
  onToggleTheme,
  onSaveProfile,
  onExportBackup,
  onImportBackup,
  onResetAll,
  backupMessage,
}) => {
  const [draft, setDraft] = useState<DeveloperProfile>(profile);
  const [skillsText, setSkillsText] = useState(profile.skills.join(', '));
  const [preferredLocText, setPreferredLocText] = useState(profile.preferredLocations.join(', '));
  const [blockedLocText, setBlockedLocText] = useState(profile.blockedLocations.join(', '));
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [newProjName, setNewProjName] = useState('');
  const [newProjFocus, setNewProjFocus] = useState('');
  const [newProjKeywords, setNewProjKeywords] = useState('');

  const totalWeight =
    draft.weights.skills +
    draft.weights.eligibility +
    draft.weights.preference +
    draft.weights.technical +
    draft.weights.urgency;

  const handleToggleCategory = (cat: OpportunityCategory) => {
    const exists = draft.preferredCategories.includes(cat);
    const nextCats = exists
      ? draft.preferredCategories.filter((c) => c !== cat)
      : [...draft.preferredCategories, cat];
    setDraft({...draft, preferredCategories: nextCats});
  };

  const handleWeightChange = (key: keyof ScoringWeights, value: number) => {
    setDraft({
      ...draft,
      weights: {
        ...draft.weights,
        [key]: Math.max(0, Math.min(100, value)),
      },
    });
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    const nextProject: FlagshipProject = {
      id: `proj-${Date.now()}`,
      name: newProjName.trim(),
      focus: newProjFocus.trim(),
      keywords: newProjKeywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
    };
    setDraft({
      ...draft,
      flagshipProjects: [...draft.flagshipProjects, nextProject],
    });
    setNewProjName('');
    setNewProjFocus('');
    setNewProjKeywords('');
  };

  const handleRemoveProject = (id: string) => {
    setDraft({
      ...draft,
      flagshipProjects: draft.flagshipProjects.filter((p) => p.id !== id),
    });
  };

  const handleApplyAndRescore = () => {
    const nextProfile: DeveloperProfile = {
      ...draft,
      skills: skillsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      preferredLocations: preferredLocText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      blockedLocations: blockedLocText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    onSaveProfile(nextProfile);
    setSavedNotice('Profile saved and all opportunities re-scored.');
    setTimeout(() => setSavedNotice(null), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Mobile Appearance & Install */}
      <section className="lg:hidden rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleTheme}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
        >
          {theme === 'dark' ? (
            <Sun className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <Moon className="w-3.5 h-3.5 text-slate-500" />
          )}
          <span>{theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
        </button>
        <div className="w-40">
          <PWAInstallButton />
        </div>
      </section>

      {/* Identity & Skills */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Developer Profile & Positioning
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Signals here directly drive deterministic opportunity matching and rationale generation.
            </p>
          </div>
          <button
            type="button"
            onClick={handleApplyAndRescore}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 whitespace-nowrap shrink-0"
          >
            Save & Re-score All
          </button>
        </div>

        {savedNotice && (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            {savedNotice}
          </p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Profile Title / Role Framing</span>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({...draft, name: e.target.value})}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Primary Location (Prioritized Eligibility)</span>
            <input
              type="text"
              value={draft.primaryLocation}
              onChange={(e) => setDraft({...draft, primaryLocation: e.target.value})}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </div>

        <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
          <span>Positioning Statement</span>
          <textarea
            rows={2}
            value={draft.positioning}
            onChange={(e) => setDraft({...draft, positioning: e.target.value})}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
          <span>Technical Skills & Domain Keywords (comma-separated)</span>
          <input
            type="text"
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Preferred Locations / Regions (comma-separated)</span>
            <input
              type="text"
              value={preferredLocText}
              onChange={(e) => setPreferredLocText(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
            <span>Hard Exclusion Phrases (flags Ineligible)</span>
            <input
              type="text"
              value={blockedLocText}
              onChange={(e) => setBlockedLocText(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="space-y-2 pt-1">
          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Preferred Opportunity Categories
          </p>
          <div className="flex flex-wrap gap-2">
            {OPPORTUNITY_CATEGORIES.map((cat) => {
              const selected = draft.preferredCategories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleToggleCategory(cat)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                    selected
                      ? 'border-sky-600 bg-sky-50 text-sky-700 dark:border-sky-400/50 dark:bg-sky-500/15 dark:text-sky-300'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Flagship Projects */}
      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Flagship Projects
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Portfolio anchors matched against incoming evaluation, systems, and grant calls.
          </p>
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
          {draft.flagshipProjects.map((proj) => (
            <div key={proj.id} className="p-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {proj.name}
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-300">{proj.focus}</p>
                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                  Signals: {proj.keywords.join(' · ')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveProject(proj.id)}
                aria-label={`Remove ${proj.name}`}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-rose-600 dark:hover:bg-slate-800 dark:hover:text-rose-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddProject} className="grid grid-cols-1 md:grid-cols-4 gap-2.5 pt-2">
          <input
            type="text"
            value={newProjName}
            onChange={(e) => setNewProjName(e.target.value)}
            placeholder="Project name"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="text"
            value={newProjFocus}
            onChange={(e) => setNewProjFocus(e.target.value)}
            placeholder="Technical focus"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="text"
            value={newProjKeywords}
            onChange={(e) => setNewProjKeywords(e.target.value)}
            placeholder="Keywords (comma-separated)"
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Project</span>
          </button>
        </form>
      </section>

      {/* Deterministic Scoring Weights + JSON Backup/Restore */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Deterministic Scoring Weights
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Normalized to 100% when scoring. Current sum:{' '}
                <span className="font-mono tabular-nums">{totalWeight}%</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDraft({...draft, weights: {...DEFAULT_WEIGHTS}})}
              className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:underline dark:text-sky-400 whitespace-nowrap"
            >
              <RotateCcw className="w-3 h-3" />
              <span>PRD Defaults</span>
            </button>
          </div>

          <div className="space-y-3">
            {(
              [
                ['skills', 'Skill & Project Overlap'],
                ['eligibility', 'Eligibility & Location Alignment'],
                ['preference', 'Opportunity Type & Benefit'],
                ['technical', 'Technical / AI Systems Depth'],
                ['urgency', 'Deadline Urgency & Effort Fit'],
              ] as Array<[keyof ScoringWeights, string]>
            ).map(([key, label]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 dark:text-slate-300">{label}</span>
                  <span className="font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    {draft.weights[key]}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={draft.weights[key]}
                  onChange={(e) => handleWeightChange(key, Number(e.target.value))}
                  className="w-full accent-sky-600"
                />
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Backup, Restore & GitHub Actions Pipeline
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All tracker data lives locally in IndexedDB + localStorage. Export JSON for portable backups.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onExportBackup}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Backup</span>
            </button>

            <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON Backup</span>
              <input
                type="file"
                accept="application/json"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onImportBackup(f);
                  e.target.value = '';
                }}
              />
            </label>

            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Seed Data</span>
            </button>
          </div>

          {backupMessage && (
            <p className="text-xs font-medium text-sky-700 dark:text-sky-300">{backupMessage}</p>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              GitHub Actions Discovery &amp; Adapter Registry
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>
                Configure <code className="font-mono text-[11px]">rss</code> (RSS/Atom),{' '}
                <code className="font-mono text-[11px]">json</code> (Greenhouse/Lever/Ashby), or{' '}
                <code className="font-mono text-[11px]">grant_program</code> sources in{' '}
                <code className="font-mono text-[11px]">scripts/discover.mjs</code>.
              </li>
              <li>
                Two-tier deduplication normalizes URLs and{' '}
                <code className="font-mono text-[11px]">organization::title</code> keys across runs, writing{' '}
                <code className="font-mono text-[11px]">public/data/opportunities.json</code>.
              </li>
              <li>
                Daily discovery runs via{' '}
                <code className="font-mono text-[11px]">.github/workflows/hunter.yml</code> and deploys via{' '}
                <code className="font-mono text-[11px]">.github/workflows/pages.yml</code>.
              </li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
};
