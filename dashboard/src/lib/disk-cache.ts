/**
 * Disk-based cache for dashboard state persistence.
 * Stores prev-week trend data and last-known stats per tier
 * so the dashboard can hydrate instantly on reboot.
 */
import { promises as fs } from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'dashboard-state.json');

// TTLs for disk-cached data
const DISK_STATS_TTL = 24 * 60 * 60 * 1000;      // 24 hours: last-known stats (always serve stale on reboot)
const DISK_PREV_WEEK_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days: historical data is stable

interface DiskCacheEntry<T = any> {
    data: T;
    savedAt: number; // Date.now() when saved
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

/** Read the disk cache, returning empty state if missing or corrupt */
export async function readDiskCache(): Promise<DiskCacheState> {
    try {
        const raw = await fs.readFile(CACHE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        // Basic shape validation
        if (parsed && typeof parsed === 'object' && parsed.stats && parsed.prevWeek) {
            return parsed as DiskCacheState;
        }
        return { ...EMPTY_STATE };
    } catch {
        // File doesn't exist or is corrupt
        return { ...EMPTY_STATE };
    }
}

/** Write the disk cache atomically (write to temp, then rename) */
export async function writeDiskCache(state: DiskCacheState): Promise<void> {
    try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        const tmpFile = CACHE_FILE + '.tmp';
        const data = JSON.stringify({ ...state, savedAt: Date.now() }, null, 0);
        await fs.writeFile(tmpFile, data, 'utf-8');
        await fs.rename(tmpFile, CACHE_FILE);
    } catch (e) {
        // Disk write failure is non-fatal — we just lose persistence
        console.warn('[DiskCache] Failed to write cache:', e);
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
