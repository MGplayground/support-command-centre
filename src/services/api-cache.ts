// Generic API cache with 5-minute TTL
interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

class APICache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private readonly TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

    set<T>(key: string, data: T): void {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        const isExpired = Date.now() - entry.timestamp > this.TTL;

        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    invalidate(key: string): void {
        this.cache.delete(key);
    }

    clear(): void {
        this.cache.clear();
    }

    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;

        const isExpired = Date.now() - entry.timestamp > this.TTL;
        if (isExpired) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }
}

export const apiCache = new APICache();
