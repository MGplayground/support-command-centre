import { apiCache } from './api-cache';

interface IntercomStats {
    solved?: {
        personal?: {
            week: number;
            month: number;
        };
        team?: {
            week: number;
            month: number;
        };
    };
    leaderboard?: Array<{
        id: string;
        name: string;
        count: number;
        avatar?: string;
    }>;
    conversationStates?: {
        open: number;
        snoozed: number;
        pending: number;
    };
    csat?: {
        week?: {
            percentage: number;
            positiveRatings: number;
            totalRatings: number;
        };
        month?: {
            percentage: number;
            positiveRatings: number;
            totalRatings: number;
        };
    };
    chatVolume?: {
        total: number;
        unassigned: number;
        active: number;
        closed_today: number;
    };
}

export async function getIntercomStats(): Promise<IntercomStats> {
    const cacheKey = 'intercom:stats';

    // Check cache first
    const cached = apiCache.get<IntercomStats>(cacheKey);
    if (cached) {
        return cached;
    }

    try {
        // Call main process API handler (keys stay secure)
        const stats = await window.electron.invokeAPI('api:intercom-stats');

        if (!stats) {
            throw new Error('No data returned from Intercom API');
        }

        apiCache.set(cacheKey, stats);
        return stats;
    } catch (error) {
        console.error('Error fetching Intercom stats:', error);
        // Don't fall back to mocks - propagate error to UI
        throw new Error(`Failed to fetch Intercom data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
