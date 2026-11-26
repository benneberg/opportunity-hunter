import type {Opportunity} from '../types';
import {daysUntilDeadline} from './scoring';

export interface DeadlineBadge {
  label: string;
  tone: 'closed' | 'urgent' | 'soon' | 'normal';
}

/** Deadline urgency is shown as its own badge; it is not part of the match score. */
export function deadlineBadge(o: Pick<Opportunity, 'deadline' | 'deadlineUrgency'>): DeadlineBadge | null {
  if (!o.deadline) return null;
  const days = daysUntilDeadline(o.deadline);
  if (o.deadlineUrgency === 'closed' || (days !== null && days < 0)) return {label: 'Deadline passed', tone: 'closed'};
  if (days === null) return {label: `Due ${o.deadline}`, tone: 'normal'};
  if (days === 0) return {label: 'Due today', tone: 'urgent'};
  if (days <= 7) return {label: `${days}d left`, tone: 'urgent'};
  if (days <= 14) return {label: `${days}d left`, tone: 'soon'};
  return {label: `${days}d left`, tone: 'normal'};
}

export const badgeClass: Record<DeadlineBadge['tone'], string> = {
  closed: 'border-slate-300 text-slate-500 dark:border-slate-700 dark:text-slate-400',
  urgent: 'border-rose-300 text-rose-700 dark:border-rose-800 dark:text-rose-400',
  soon: 'border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400',
  normal: 'border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300',
};
