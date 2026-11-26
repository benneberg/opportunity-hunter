import type {EligibilityStatus, ExternalStatus, WorkflowStatus} from '../types';

export function formatEligibilityLabel(status: EligibilityStatus): string {
  switch (status) {
    case 'confirmed_eligible':
      return 'Confirmed Eligible';
    case 'likely_eligible':
      return 'Likely Eligible';
    case 'uncertain':
      return 'Uncertain Eligibility';
    case 'ineligible':
      return 'Ineligible';
  }
}

export function eligibilityTextClass(status: EligibilityStatus): string {
  switch (status) {
    case 'confirmed_eligible':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'likely_eligible':
      return 'text-sky-700 dark:text-sky-400';
    case 'uncertain':
      return 'text-amber-700 dark:text-amber-400';
    case 'ineligible':
      return 'text-rose-700 dark:text-rose-400';
  }
}

export function formatExternalStatus(status: ExternalStatus): string {
  switch (status) {
    case 'open':
      return 'Open';
    case 'closing_soon':
      return 'Closing Soon';
    case 'closed':
      return 'Closed';
    case 'unknown':
      return 'Status Unknown';
  }
}

export function externalStatusTextClass(status: ExternalStatus): string {
  switch (status) {
    case 'open':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'closing_soon':
      return 'text-amber-700 dark:text-amber-400';
    case 'closed':
      return 'text-rose-700 dark:text-rose-400';
    case 'unknown':
      return 'text-slate-500 dark:text-slate-400';
  }
}

export function formatWorkflowStatus(status: WorkflowStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function scoreTextClass(score: number, eligibility: EligibilityStatus): string {
  if (eligibility === 'ineligible') return 'text-rose-600 dark:text-rose-400';
  if (score >= 80) return 'text-emerald-700 dark:text-emerald-400';
  if (score >= 60) return 'text-sky-700 dark:text-sky-400';
  return 'text-slate-600 dark:text-slate-400';
}
