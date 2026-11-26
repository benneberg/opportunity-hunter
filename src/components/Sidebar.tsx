import React from 'react';
import {
  Briefcase,
  GitBranch,
  LayoutDashboard,
  Link2,
  Moon,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import type {ActiveTab} from '../types';
import {PWAInstallButton} from './PWAInstallButton';

interface SidebarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  counts: {
    newCount: number;
    totalCount: number;
    otherCount: number;
    pipelineCount: number;
  };
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  lastFeedSync: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  counts,
  theme,
  onToggleTheme,
  lastFeedSync,
}) => {
  const navItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.FC<{className?: string}>;
    count?: number;
  }> = [
    {id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, count: counts.newCount},
    {id: 'opportunities', label: 'Opportunities', icon: Briefcase, count: counts.totalCount},
    {id: 'other', label: 'Other Links & Jobs', icon: Link2, count: counts.otherCount},
    {id: 'pipeline', label: 'Pipeline', icon: GitBranch, count: counts.pipelineCount},
    {id: 'profile', label: 'Profile & Rules', icon: SlidersHorizontal},
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-60 lg:shrink-0 lg:flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex h-16 items-center px-5 border-b border-slate-200 dark:border-slate-800">
          <span className="font-display text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap">
            Opportunity Hunter
          </span>
        </div>

        <nav aria-label="Primary navigation" className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/70 dark:hover:text-slate-100'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {typeof item.count === 'number' && (
                  <span className="font-mono text-xs tabular-nums text-slate-500 dark:text-slate-400">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
          <PWAInstallButton />

          <button
            type="button"
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <span className="flex items-center gap-2">
              {theme === 'dark' ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-500" />
              )}
              <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
            </span>
          </button>

          <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400 font-mono tabular-nums">
            {lastFeedSync
              ? `Synced ${new Date(lastFeedSync).toLocaleDateString()}`
              : 'Local IndexedDB store'}
          </p>
        </div>
      </aside>

      {/* Mobile Compact Bottom Tab Bar (<= 15% viewport height) */}
      <nav
        aria-label="Mobile navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95"
      >
        <div className="grid grid-cols-5 h-14">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors ${
                  active
                    ? 'text-sky-600 dark:text-sky-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate max-w-[76px]">{item.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
