import type {AppState, FeedSyncStats, Opportunity} from '../types';
import {getSeedOpportunities, INITIAL_PROFILE} from './seed';
import {buildDedupeKey, parseUntrustedJsonBatch, rescoreAllOpportunities, scoreOpportunity} from './scoring';

const STORAGE_KEY = 'opp_hunter_state_v1';
const DB_NAME = 'opp_hunter_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_state';
const RECORD_KEY = 'primary';

function getDefaultState(): AppState {
  const profile = INITIAL_PROFILE;
  return {
    opportunities: getSeedOpportunities(profile),
    profile,
    lastFeedSync: null,
    theme: 'light',
  };
}

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readFromIDB(): Promise<AppState | null> {
  const db = await openDatabase();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RECORD_KEY);
      req.onsuccess = () => resolve((req.result as AppState) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeToIDB(state: AppState): Promise<void> {
  const db = await openDatabase();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(state, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function readFromLocalStorage(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    if (!parsed || !Array.isArray(parsed.opportunities)) return null;
    const profile = parsed.profile || INITIAL_PROFILE;
    return {
      opportunities: rescoreAllOpportunities(parsed.opportunities, profile),
      profile,
      lastFeedSync: parsed.lastFeedSync || null,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
    };
  } catch {
    return null;
  }
}

export async function loadAppState(): Promise<AppState> {
  const fromIdb = await readFromIDB();
  if (fromIdb && Array.isArray(fromIdb.opportunities)) {
    const profile = fromIdb.profile || INITIAL_PROFILE;
    return {
      opportunities: rescoreAllOpportunities(fromIdb.opportunities, profile),
      profile,
      lastFeedSync: fromIdb.lastFeedSync || null,
      theme: fromIdb.theme === 'dark' ? 'dark' : 'light',
    };
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

export async function mergeRemoteFeed(
  currentState: AppState
): Promise<{ state: AppState; addedCount: number; updatedCount: number; updatedAt: string | null }> {
  try {
    const res = await fetch('./data/opportunities.json', { cache: 'no-store' });
    if (!res.ok) {
      return {
        state: currentState,
        addedCount: 0,
        updatedCount: 0,
        updatedAt: currentState.lastFeedSync,
      };
    }
    const text = await res.text();
    const raw = JSON.parse(text) as {
      updatedAt?: string | null;
      stats?: FeedSyncStats;
      items?: unknown[];
    };
    const updatedAt = raw.updatedAt || currentState.lastFeedSync;
    const feedStats = raw.stats || currentState.feedStats || null;

    if (!Array.isArray(raw.items) || raw.items.length === 0) {
      const nextState: AppState = {
        ...currentState,
        lastFeedSync: updatedAt || currentState.lastFeedSync,
        feedStats,
      };
      return { state: nextState, addedCount: 0, updatedCount: 0, updatedAt };
    }

    const parsed = parseUntrustedJsonBatch(JSON.stringify(raw.items), currentState.profile);
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
        const refreshedBase = {
          ...existing,
          title: remoteItem.title || existing.title,
          location: remoteItem.location || existing.location,
          summary: remoteItem.summary || existing.summary,
          externalStatus: remoteItem.externalStatus || existing.externalStatus,
          lastCheckedAt: remoteItem.lastCheckedAt || existing.lastCheckedAt,
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

    const nextState: AppState = {
      ...currentState,
      opportunities: [...newItems, ...mergedList],
      lastFeedSync: updatedAt || new Date().toISOString(),
      feedStats,
    };

    await saveAppState(nextState);
    return {
      state: nextState,
      addedCount,
      updatedCount,
      updatedAt: nextState.lastFeedSync,
    };
  } catch {
    return {
      state: currentState,
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
