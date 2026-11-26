import type {AppState, FeedSyncStats, Opportunity, SyncStatus} from '../types';
import {getSeedOpportunities, INITIAL_PROFILE} from './seed';
import {buildDedupeKey, parseUntrustedJsonBatch, rescoreAllOpportunities, scoreOpportunity} from './scoring';

const STORAGE_KEY = 'opp_hunter_state_v1';
const DB_NAME = 'opp_hunter_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const RECORD_KEY = 'primary';

export interface SyncResult {
  state: AppState;
  status: SyncStatus;
  message: string;
  addedCount: number;
  updatedCount: number;
  updatedAt: string | null;
}

function getDefaultState(): AppState {
  const profile = INITIAL_PROFILE;
  return {
    opportunities: getSeedOpportunities(profile),
    profile,
    lastFeedSync: null,
    feedStats: null,
    syncStatus: undefined,
    syncError: null,
    theme: 'light',
  };
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = (db: IDBDatabase | null) => {
      if (!settled) {
        settled = true;
        resolve(db);
      }
    };
    const timer = setTimeout(() => finish(null), 1200);
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => {
        clearTimeout(timer);
        finish(req.result);
      };
      req.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };
      req.onblocked = () => {
        clearTimeout(timer);
        finish(null);
      };
    } catch {
      clearTimeout(timer);
      finish(null);
    }
  });
}

async function readFromIDB(): Promise<AppState | null> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val: AppState | null) => {
      if (!settled) {
        settled = true;
        resolve(val);
      }
    };
    const timer = setTimeout(() => finish(null), 1200);
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);
      req.onsuccess = () => {
        clearTimeout(timer);
        finish((req.result as AppState) || null);
      };
      req.onerror = () => {
        clearTimeout(timer);
        finish(null);
      };
      tx.onabort = () => {
        clearTimeout(timer);
        finish(null);
      };
    } catch {
      clearTimeout(timer);
      finish(null);
    }
  });
}

async function writeToIDB(state: AppState): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    const timer = setTimeout(finish, 1200);
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(state, RECORD_KEY);
      tx.oncomplete = () => {
        clearTimeout(timer);
        finish();
      };
      tx.onerror = () => {
        clearTimeout(timer);
        finish();
      };
      tx.onabort = () => {
        clearTimeout(timer);
        finish();
      };
    } catch {
      clearTimeout(timer);
      finish();
    }
  });
}

function hydrateState(parsed: Partial<AppState>): AppState {
  const profile = parsed.profile || INITIAL_PROFILE;
  return {
    opportunities: rescoreAllOpportunities(parsed.opportunities || [], profile),
    profile,
    lastFeedSync: parsed.lastFeedSync || null,
    feedStats: parsed.feedStats || null,
    syncStatus: parsed.syncStatus,
    syncError: parsed.syncError || null,
    theme: parsed.theme === 'dark' ? 'dark' : 'light',
  };
}

function readFromLocalStorage(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || !Array.isArray(parsed.opportunities)) return null;
    return hydrateState(parsed);
  } catch {
    return null;
  }
}

export function loadInitialSyncState(): AppState {
  return readFromLocalStorage() || getDefaultState();
}

export async function loadAppState(): Promise<AppState> {
  const fromIdb = await readFromIDB();
  if (fromIdb && Array.isArray(fromIdb.opportunities)) {
    return hydrateState(fromIdb);
  }

  const fromLs = readFromLocalStorage();
  if (fromLs) {
    await writeToIDB(fromLs);
    return fromLs;
  }

  const fallback = getDefaultState();
  await saveAppState(fallback);
  return fallback;
}

export async function saveAppState(state: AppState): Promise<void> {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors if localStorage unavailable
  }
  await writeToIDB(state);
}

export async function mergeRemoteFeed(currentState: AppState): Promise<SyncResult> {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const feedUrl = `${baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`}data/opportunities.json`;

  try {
    const res = await fetch(feedUrl, { cache: 'no-store' });
    if (!res.ok) {
      const status: SyncStatus = res.status === 404 ? 'feed_unavailable' : 'sync_failed';
      const errorMsg = `Feed fetch returned HTTP ${res.status} (${feedUrl})`;
      const nextState: AppState = {
        ...currentState,
        syncStatus: status,
        syncError: errorMsg,
      };
      return {
        state: nextState,
        status,
        message:
          status === 'feed_unavailable'
            ? 'Discovery feed file not found at deployed path.'
            : `Feed sync failed (HTTP ${res.status}).`,
        addedCount: 0,
        updatedCount: 0,
        updatedAt: currentState.lastFeedSync,
      };
    }

    const text = await res.text();
    let raw: {
      updatedAt?: string | null;
      stats?: FeedSyncStats;
      items?: unknown[];
    };

    try {
      raw = JSON.parse(text) as {
        updatedAt?: string | null;
        stats?: FeedSyncStats;
        items?: unknown[];
      };
    } catch {
      const nextState: AppState = {
        ...currentState,
        syncStatus: 'sync_failed',
        syncError: 'Feed JSON is malformed and could not be parsed.',
      };
      return {
        state: nextState,
        status: 'sync_failed',
        message: 'Feed sync failed: invalid JSON payload.',
        addedCount: 0,
        updatedCount: 0,
        updatedAt: currentState.lastFeedSync,
      };
    }

    const updatedAt = raw.updatedAt || currentState.lastFeedSync;
    const feedStats = raw.stats || currentState.feedStats || null;

    if (!Array.isArray(raw.items) || raw.items.length === 0) {
      const isFailed = feedStats?.syncHealth === 'failed';
      const status: SyncStatus = isFailed ? 'sync_failed' : 'feed_unavailable';
      const msg = isFailed
        ? 'All configured discovery sources failed during the latest workflow run.'
        : 'Discovery feed contains 0 live items. Run `npm run discover` or trigger the GitHub Actions workflow.';
      const nextState: AppState = {
        ...currentState,
        lastFeedSync: updatedAt || currentState.lastFeedSync,
        feedStats,
        syncStatus: status,
        syncError: isFailed ? msg : null,
      };
      await saveAppState(nextState);
      return {
        state: nextState,
        status,
        message: msg,
        addedCount: 0,
        updatedCount: 0,
        updatedAt: nextState.lastFeedSync,
      };
    }

    const parsed = parseUntrustedJsonBatch(JSON.stringify(raw.items), currentState.profile, 'feed');
    if (parsed.error) {
      const nextState: AppState = {
        ...currentState,
        syncStatus: 'sync_failed',
        syncError: parsed.error,
      };
      return {
        state: nextState,
        status: 'sync_failed',
        message: `Feed sync failed: ${parsed.error}`,
        addedCount: 0,
        updatedCount: 0,
        updatedAt: currentState.lastFeedSync,
      };
    }

    const existingById = new Map<string, number>();
    const existingByKey = new Map<string, number>();
    const mergedList = [...currentState.opportunities];

    mergedList.forEach((opp, idx) => {
      existingById.set(opp.id, idx);
      const key = opp.dedupeKey || buildDedupeKey(opp);
      existingByKey.set(key, idx);
    });

    let addedCount = 0;
    let updatedCount = 0;
    const newItems: Opportunity[] = [];

    for (const remoteItem of parsed.items) {
      const key = remoteItem.dedupeKey || buildDedupeKey(remoteItem);
      const matchIdx = existingById.get(remoteItem.id) ?? existingByKey.get(key);

      if (matchIdx !== undefined) {
        const existing = mergedList[matchIdx];
        const refreshedBase: Opportunity = {
          ...existing,
          title: remoteItem.title || existing.title,
          organization: remoteItem.organization || existing.organization,
          category: remoteItem.category || existing.category,
          location: remoteItem.location || existing.location,
          url: remoteItem.url || existing.url,
          compensation: remoteItem.compensation ?? existing.compensation,
          deadline: remoteItem.deadline ?? existing.deadline,
          summary: remoteItem.summary || existing.summary,
          tags: remoteItem.tags.length > 0 ? remoteItem.tags : existing.tags,
          externalStatus: remoteItem.externalStatus || existing.externalStatus,
          lastCheckedAt: remoteItem.lastCheckedAt || existing.lastCheckedAt,
          provenance: remoteItem.provenance || existing.provenance,
          source: 'feed',
          dedupeKey: key,
        };
        mergedList[matchIdx] = {
          ...refreshedBase,
          ...scoreOpportunity(refreshedBase, currentState.profile),
        };
        updatedCount++;
      } else {
        newItems.push({ ...remoteItem, dedupeKey: key, source: 'feed' });
        existingByKey.set(key, -1);
        addedCount++;
      }
    }

    const hasPartialErrors =
      feedStats?.syncHealth === 'partial' ||
      Boolean(feedStats?.sources?.some((s) => s.status === 'error'));

    const status: SyncStatus = hasPartialErrors
      ? 'partial_sync'
      : addedCount > 0 || updatedCount > 0
        ? 'synced_updated'
        : 'synced_no_changes';

    const syncedTime = updatedAt || new Date().toISOString();
    const message = hasPartialErrors
      ? `Partial feed sync: ${addedCount} new, ${updatedCount} refreshed (one or more sources reported errors).`
      : addedCount > 0 || updatedCount > 0
        ? `Synced ${parsed.items.length} verified feed items (${addedCount} new, ${updatedCount} refreshed).`
        : 'Feed checked — all verified items are already up to date.';

    const nextState: AppState = {
      ...currentState,
      opportunities: [...newItems, ...mergedList],
      lastFeedSync: syncedTime,
      feedStats,
      syncStatus: status,
      syncError: null,
    };

    await saveAppState(nextState);
    return {
      state: nextState,
      status,
      message,
      addedCount,
      updatedCount,
      updatedAt: syncedTime,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Network error while fetching feed.';
    const nextState: AppState = {
      ...currentState,
      syncStatus: 'sync_failed',
      syncError: errorMsg,
    };
    return {
      state: nextState,
      status: 'sync_failed',
      message: `Feed sync failed: ${errorMsg}`,
      addedCount: 0,
      updatedCount: 0,
      updatedAt: currentState.lastFeedSync,
    };
  }
}

export function resetToDefaultState(currentTheme: 'light' | 'dark'): AppState {
  const def = getDefaultState();
  return { ...def, theme: currentTheme };
}
