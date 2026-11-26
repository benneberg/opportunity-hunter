import type {Opportunity} from '../types';

/** Items scoring below this are listed under "Other Links & Jobs" instead of the main list. */
export const MATCH_THRESHOLD = 45;

const KEEP_IN_MAIN = new Set(['saved', 'preparing', 'applied', 'interview', 'accepted']);

/**
 * Returns why an item belongs in the "Other" view, or null if it belongs in the main list.
 * Nothing is deleted: Other still lists every item, with a reason.
 */
export function otherReason(o: Opportunity): string | null {
  if (o.workflowStatus === 'dismissed') return 'Dismissed by you';
  if (KEEP_IN_MAIN.has(o.workflowStatus)) return null;
  if (o.itemType === 'announcement') return 'Announcement or news: a lead to follow, not an open opportunity';
  if (o.eligibility === 'confirmed_ineligible') {
    return `Likely not open to you: ${o.eligibilityReason || 'eligibility restriction'}`;
  }
  if (o.externalStatus === 'closed') return 'Closed at the source';
  if (o.score < MATCH_THRESHOLD) return `Weaker match (score ${o.score}, below ${MATCH_THRESHOLD})`;
  return null;
}
