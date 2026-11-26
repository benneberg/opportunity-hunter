import {useEffect, useState} from 'react';
import {Plus} from 'lucide-react';
import type {ActiveTab, AppState, DeveloperProfile, Opportunity, WorkflowStatus} from './types';
import {
  loadAppState,
  mergeRemoteFeed,
  resetToDefaultState,
  saveAppState,
} from './lib/storage';
import {
  buildDedupeKey,
  parseUntrustedJsonBatch,
  rescoreAllOpportunities,
  scoreOpportunity,
} from './lib/scoring';
import {Sidebar} from './components/Sidebar';
import {DashboardView} from './components/DashboardView';
import {OpportunitiesView} from './components/OpportunitiesView';
import {PipelineView} from './components/PipelineView';
import {ProfileView} from './components/ProfileView';
import {OpportunityModal} from './components/OpportunityModal';
import {OpportunityDetailDrawer} from './components/OpportunityDetailDrawer';
import {OfflineIndicator} from './components/OfflineIndicator';

const TAB_LABELS: Record<ActiveTab, string> = {
  dashboard: 'Dashboard',
  opportunities: 'Opportunities',
  pipeline: 'Pipeline',
  profile: 'Profile & Rules',
};

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'single' | 'json'>('single');
  const [editingOpp, setEditingOpp] = useState<Opportunity | null>(null);
  const [inspectingId, setInspectingId] = useState<string | null>(null);

  // Load IndexedDB / localStorage state on mount and sync static feed
  useEffect(() => {
    let mounted = true;
    (async () => {
      const loaded = await loadAppState();
      if (!mounted) return;
      setState(loaded);
      const merged = await mergeRemoteFeed(loaded);
      if (!mounted) return;
      if (merged.addedCount > 0 || merged.updatedAt !== loaded.lastFeedSync) {
        setState(merged.state);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Apply .dark class to <html>
  useEffect(() => {
    if (!state) return;
    const root = document.documentElement;
    if (state.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [state?.theme]);

  const commitState = (next: AppState) => {
    setState(next);
    void saveAppState(next);
  };

  const handleToggleTheme = () => {
    if (!state) return;
    commitState({
      ...state,
      theme: state.theme === 'dark' ? 'light' : 'dark',
    });
  };

  const handleSyncFeed = async () => {
    if (!state) return;
    setIsSyncing(true);
    setSyncFeedback(null);
    const result = await mergeRemoteFeed(state);
    setState(result.state);
    setIsSyncing(false);
    setSyncFeedback(
      result.addedCount > 0 || result.updatedCount > 0
        ? `Synced feed: ${result.addedCount} new, ${result.updatedCount} refreshed.`
        : 'Feed checked — no new or updated items beyond current tracker.'
    );
  };

  const handleUpdateWorkflow = (id: string, workflowStatus: WorkflowStatus) => {
    if (!state) return;
    const updated = state.opportunities.map((opp) => {
      if (opp.id !== id) return opp;
      const draft = {...opp, workflowStatus, updatedAt: new Date().toISOString()};
      return {...draft, ...scoreOpportunity(draft, state.profile)};
    });
    commitState({...state, opportunities: updated});
  };

  const handleUpdateOpportunity = (id: string, patch: Partial<Opportunity>) => {
    if (!state) return;
    const updated = state.opportunities.map((opp) => {
      if (opp.id !== id) return opp;
      const draft = {...opp, ...patch, updatedAt: new Date().toISOString()};
      return {...draft, ...scoreOpportunity(draft, state.profile)};
    });
    commitState({...state, opportunities: updated});
  };

  const handleSaveSingle = (opp: Opportunity, isEdit: boolean) => {
    if (!state) return;
    const nextOpps = isEdit
      ? state.opportunities.map((item) => (item.id === opp.id ? opp : item))
      : [opp, ...state.opportunities];
    commitState({...state, opportunities: nextOpps});
    setModalOpen(false);
    setEditingOpp(null);
  };

  const handleImportBatch = (items: Opportunity[]) => {
    if (!state) return;
    const existingIds = new Set(state.opportunities.map((o) => o.id));
    const existingKeys = new Set(
      state.opportunities.map((o) => o.dedupeKey || buildDedupeKey(o))
    );
    const uniqueNew = items.filter((item) => {
      const key = item.dedupeKey || buildDedupeKey(item);
      if (existingIds.has(item.id) || existingKeys.has(key)) return false;
      existingKeys.add(key);
      return true;
    });
    commitState({
      ...state,
      opportunities: [...uniqueNew, ...state.opportunities],
    });
    setModalOpen(false);
  };

  const handleDeleteOpportunity = (id: string) => {
    if (!state) return;
    commitState({
      ...state,
      opportunities: state.opportunities.filter((o) => o.id !== id),
    });
  };

  const handleSaveProfile = (nextProfile: DeveloperProfile) => {
    if (!state) return;
    const rescored = rescoreAllOpportunities(state.opportunities, nextProfile);
    commitState({
      ...state,
      profile: nextProfile,
      opportunities: rescored,
    });
  };

  const handleExportBackup = () => {
    if (!state) return;
    const blob = new Blob([JSON.stringify(state, null, 2)], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opportunity-hunter-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMessage('Exported full JSON backup (profile, rules, and opportunities).');
  };

  const handleImportBackup = async (file: File) => {
    if (!state) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Partial<AppState> & {items?: unknown[]};
      const nextProfile = parsed.profile || state.profile;
      const rawItems = Array.isArray(parsed.opportunities)
        ? parsed.opportunities
        : Array.isArray(parsed.items)
          ? parsed.items
          : null;

      if (!rawItems) {
        setBackupMessage('Invalid backup file: missing opportunities array.');
        return;
      }

      const sanitized = parseUntrustedJsonBatch(JSON.stringify(rawItems), nextProfile);
      if (sanitized.error) {
        setBackupMessage(`Import failed: ${sanitized.error}`);
        return;
      }

      commitState({
        opportunities: sanitized.items,
        profile: nextProfile,
        lastFeedSync: parsed.lastFeedSync || new Date().toISOString(),
        theme: state.theme,
      });
      setBackupMessage(`Imported ${sanitized.items.length} opportunities cleanly.`);
    } catch {
      setBackupMessage('Could not parse JSON backup file.');
    }
  };

  const handleResetAll = () => {
    if (!state) return;
    const resetState = resetToDefaultState(state.theme);
    commitState(resetState);
    setBackupMessage('Restored seeded opportunities and default PRD profile.');
  };

  if (!state) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B111E] text-sm text-slate-500">
        Loading workspace...
      </div>
    );
  }

  const inspectingOpp =
    inspectingId ? state.opportunities.find((o) => o.id === inspectingId) || null : null;

  const newCount = state.opportunities.filter((o) => o.workflowStatus === 'new').length;
  const pipelineCount = state.opportunities.filter((o) =>
    ['saved', 'preparing', 'applied', 'interview'].includes(o.workflowStatus)
  ).length;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-[#0B111E] dark:text-slate-100 pb-16 lg:pb-0">
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        counts={{
          newCount,
          totalCount: state.opportunities.length,
          pipelineCount,
        }}
        theme={state.theme}
        onToggleTheme={handleToggleTheme}
        lastFeedSync={state.lastFeedSync}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: 3 clean zones (Page Title, Primary Context Link, 1 Primary CTA) */}
        <header className="h-16 px-4 sm:px-8 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/90 flex items-center justify-between gap-8 shrink-0">
          <h1 className="font-display text-lg font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0">
            {TAB_LABELS[activeTab]}
          </h1>

          <div className="hidden md:flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate max-w-md">
              {state.profile.primaryLocation} Priority · AI Systems &amp; Evaluation
            </span>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditingOpp(null);
                setModalMode('single');
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Opportunity</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 sm:px-8 py-6 max-w-6xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              opportunities={state.opportunities}
              lastFeedSync={state.lastFeedSync}
              isSyncing={isSyncing}
              syncFeedback={syncFeedback}
              onSyncFeed={() => void handleSyncFeed()}
              onNavigate={setActiveTab}
              onSelectOpportunity={(opp) => setInspectingId(opp.id)}
              onUpdateWorkflow={handleUpdateWorkflow}
            />
          )}

          {activeTab === 'opportunities' && (
            <OpportunitiesView
              opportunities={state.opportunities}
              onSelectOpportunity={(opp) => setInspectingId(opp.id)}
              onEditOpportunity={(opp) => {
                setEditingOpp(opp);
                setModalMode('single');
                setModalOpen(true);
              }}
              onOpenAddModal={(mode) => {
                setEditingOpp(null);
                setModalMode(mode);
                setModalOpen(true);
              }}
              onUpdateWorkflow={handleUpdateWorkflow}
            />
          )}

          {activeTab === 'pipeline' && (
            <PipelineView
              opportunities={state.opportunities}
              onUpdateOpportunity={handleUpdateOpportunity}
              onSelectOpportunity={(opp) => setInspectingId(opp.id)}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              profile={state.profile}
              theme={state.theme}
              onToggleTheme={handleToggleTheme}
              onSaveProfile={handleSaveProfile}
              onExportBackup={handleExportBackup}
              onImportBackup={(f) => void handleImportBackup(f)}
              onResetAll={handleResetAll}
              backupMessage={backupMessage}
            />
          )}
        </main>
      </div>

      {modalOpen && (
        <OpportunityModal
          mode={modalMode}
          editingOpportunity={editingOpp}
          profile={state.profile}
          onClose={() => {
            setModalOpen(false);
            setEditingOpp(null);
          }}
          onSaveSingle={handleSaveSingle}
          onImportBatch={handleImportBatch}
        />
      )}

      <OpportunityDetailDrawer
        opportunity={inspectingOpp}
        profile={state.profile}
        onClose={() => setInspectingId(null)}
        onEdit={(opp) => {
          setInspectingId(null);
          setEditingOpp(opp);
          setModalMode('single');
          setModalOpen(true);
        }}
        onDelete={handleDeleteOpportunity}
        onUpdateOpportunity={handleUpdateOpportunity}
      />

      <OfflineIndicator />
    </div>
  );
}
