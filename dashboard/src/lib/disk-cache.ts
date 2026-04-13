/**
 * persistent cache for dashboard state.
 * Supports Vercel KV (Redis) for production and local disk for development.
 * Stores prev-week trend data and last-known stats per tier.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { kv } from '@vercel/kv';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'dashboard-state-v2.json');
const KV_KEY = 'dashboard_state_v2';

// TTLs for cached data
const DISK_STATS_TTL = 24 * 60 * 60 * 1000;      // 24 hours
const DISK_PREV_WEEK_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

interface DiskCacheEntry<T = any> {
    data: T;
    savedAt: number;
}

interface DiskCacheState {
    stats: Record<string, DiskCacheEntry>;
    prevWeek: Record<string, DiskCacheEntry>;
    savedAt: number;
}

const EMPTY_STATE: DiskCacheState = {
    stats: {},
    prevWeek: {},
    savedAt: 0,
};

/** Read the cache from KV or Disk */
export async function readDiskCache(): Promise<DiskCacheState> {
    // 1. Try Vercel KV first if configured
    if (process.env.KV_REST_API_URL) {
        try {
            const data = await kv.get<DiskCacheState>(KV_KEY);
            if (data && typeof data === 'object' && data.stats) {
                return data;
            }
        } catch (e) {
            console.warn('[Cache] Vercel KV read failed, checking disk...', e);
        }
    }

    // 2. Fallback to Disk
    try {
        const raw = await fs.readFile(CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.stats && parsed.prevWeek) {
            return parsed as DiskCacheState;
        }
    } catch {
        // Disk read failed or missing
    }

    return { ...EMPTY_STATE };
}

/** Write the cache to KV or Disk */
export async function writeDiskCache(state: DiskCacheState): Promise<void> {
    const stateWithTimestamp = { ...state, savedAt: Date.now() };

    // 1. Try Vercel KV first if configured
    if (process.env.KV_REST_API_URL) {
        try {
            await kv.set(KV_KEY, stateWithTimestamp);
            return;
        } catch (e) {
            console.warn('[Cache] Vercel KV write failed, falling back to disk...', e);
        }
    }

    // 2. Fallback to Disk
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        const tmpFile = CACHE_FILE + '.tmp';
        const data = JSON.stringify(stateWithTimestamp, null, 0);
        await fs.writeFile(tmpFile, data, 'utf-8');
        await fs.rename(tmpFile, CACHE_FILE);
    } catch (e) {
        console.warn('[Cache] Disk write failed:', e);
    }
}

/** Get cached stats for a tier if still within TTL */
export function getCachedStats(state: DiskCacheState, tierKey: string): any | null {
    const entry = state.stats[tierKey];
    if (!entry) return null;
    if (Date.now() - entry.savedAt > DISK_STATS_TTL) return null;
    return entry.data;
}

/** Get cached prev-week data for a tier if still within 24h TTL */
export function getCachedPrevWeek(state: DiskCacheState, tierKey: string): any | null {
    const entry = state.prevWeek[tierKey];
    if (!entry) return null;
    if (Date.now() - entry.savedAt > DISK_PREV_WEEK_TTL) return null;
    return entry.data;
}

/** Update stats in cache state (call writeDiskCache after) */
export function setCachedStats(state: DiskCacheState, tierKey: string, data: any): DiskCacheState {
    return {
        ...state,
        stats: {
            ...state.stats,
            [tierKey]: { data, savedAt: Date.now() }
        }
    };
}

/** Update prev-week in cache state (call writeDiskCache after) */
export function setCachedPrevWeek(state: DiskCacheState, tierKey: string, data: any): DiskCacheState {
    return {
        ...state,
        prevWeek: {
            ...state.prevWeek,
            [tierKey]: { data, savedAt: Date.now() }
        }
    };
}
