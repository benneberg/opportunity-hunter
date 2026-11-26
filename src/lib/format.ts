import type {
  ApplicationEffort,
  EligibilityStatus,
  ExpectedValue,
  ExternalStatus,
  SyncStatus,
  VerificationStatus,
  WorkflowStatus,
} from '../types';

export function formatEligibilityLabel(status: EligibilityStatus): string {
  switch (status) {
    case 'confirmed_eligible':
      return 'Confirmed Eligible';
    case 'likely_eligible':
      return 'Likely Eligible';
    case 'requires_verification':
      return 'Requires Verification';
    case 'confirmed_ineligible':
      return 'Confirmed Ineligible';
  }
}

export function eligibilityTextClass(status: EligibilityStatus): string {
  switch (status) {
    case 'confirmed_eligible':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'likely_eligible':
      return 'text-sky-700 dark:text-sky-400';
    case 'requires_verification':
      return 'text-amber-700 dark:text-amber-400';
    case 'confirmed_ineligible':
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

export function formatVerificationLabel(status?: VerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'Verified Live';
    case 'unverified':
      return 'Manual / Unverified';
    case 'unavailable':
      return 'Source Unavailable';
    case 'expired':
      return 'Expired';
    case 'demo':
      return 'Demo Seed';
    default:
      return 'Unverified';
  }
}

export function verificationTextClass(status?: VerificationStatus): string {
  switch (status) {
    case 'verified':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'demo':
      return 'text-slate-500 dark:text-slate-400';
    case 'unavailable':
    case 'expired':
      return 'text-rose-700 dark:text-rose-400';
    default:
      return 'text-amber-700 dark:text-amber-400';
  }
}

export function formatSyncStatusLabel(status?: SyncStatus): string {
  switch (status) {
    case 'synced_updated':
      return 'Synced (Updated)';
    case 'synced_no_changes':
      return 'Synced (Up to Date)';
    case 'partial_sync':
      return 'Partial Sync';
    case 'sync_failed':
      return 'Sync Failed';
    case 'feed_unavailable':
      return 'Feed Unavailable';
    default:
      return 'Not Synced';
  }
}

export function syncStatusTextClass(status?: SyncStatus): string {
  switch (status) {
    case 'synced_updated':
    case 'synced_no_changes':
      return 'text-emerald-700 dark:text-emerald-400';
    case 'partial_sync':
    case 'feed_unavailable':
      return 'text-amber-700 dark:text-amber-400';
    case 'sync_failed':
      return 'text-rose-700 dark:text-rose-400';
    default:
      return 'text-slate-500 dark:text-slate-400';
  }
}

export function formatEffortLabel(effort?: ApplicationEffort): string {
  if (!effort) return 'Medium';
  return effort.charAt(0).toUpperCase() + effort.slice(1);
}

export function formatExpectedValue(val?: ExpectedValue): string {
  if (!val) return 'Standard';
  return val.charAt(0).toUpperCase() + val.slice(1);
}

export function formatWorkflowStatus(status: WorkflowStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function scoreTextClass(score: number, eligibility: EligibilityStatus): string {
  if (eligibility === 'confirmed_ineligible') return 'text-rose-600 dark:text-rose-400';
  if (score >= 78) return 'text-emerald-700 dark:text-emerald-400';
  if (score >= 60) return 'text-sky-700 dark:text-sky-400';
  return 'text-slate-600 dark:text-slate-400';
}
