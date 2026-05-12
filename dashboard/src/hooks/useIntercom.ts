'use client';

import useSWR from 'swr';
import { IntercomStats, TierType } from '@/lib/intercom-types';
import { getTierConfig } from '@/lib/tier-config';
import { useEffect, useState } from 'react';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (res.status === 401) {
        // Session expired or not logged in — redirect to login
        window.location.href = '/login';
        return;
    }
    if (!res.ok) {
        const error: any = new Error('API request failed');
        error.status = res.status;
        try { error.info = await res.json(); } catch {}
        throw error;
    }
    return res.json();
};


interface UseIntercomOptions {
    refreshInterval?: number; // milliseconds, 0 = manual only
    enabled?: boolean; // whether to fetch data
    onUpdate?: (stats: IntercomStats) => void;
    isLightweight?: boolean; // Skip heavy Databricks queries
}

export function useIntercom(tier?: TierType, timeframe?: string, options: UseIntercomOptions = {}) {
    const {
        refreshInterval = 60000, // Default: 1 minute
        enabled = true,
        onUpdate,
        isLightweight = false
    } = options;

    // Get team ID from tier config
    const teamId = tier ? getTierConfig(tier).teamId : null;

    // Build URL with tier and timeframe parameters
    const params = new URLSearchParams();
    if (teamId && teamId !== 'all') params.append('teamId', teamId);
    if (timeframe) params.append('timeframe', timeframe);
    if (isLightweight) params.append('lightweight', 'true');
    params.append('v', '2'); // Bust old cache shapes for the Refactor

    const url = `/api/intercom${params.toString() ? `?${params.toString()}` : ''}`;

    // Track if document is visible (pause when tab is inactive)
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsVisible(!document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Only refresh if enabled, visible, and interval is set
    const effectiveRefreshInterval = enabled && isVisible && refreshInterval > 0
        ? refreshInterval
        : 0;

    const { data, error, isLoading, isValidating, mutate } = useSWR<IntercomStats>(
        enabled ? url : null,
        fetcher,
        {
            refreshInterval: effectiveRefreshInterval,
            revalidateOnFocus: true,
            dedupingInterval: 5000,
            keepPreviousData: false, // Clear stale data immediately when tier/timeframe changes
            onSuccess: (stats) => {
                if (onUpdate) {
                    onUpdate(stats);
                }
            }
        }
    );

    return {
        stats: data,
        isLoading,
        isValidating,
        isError: error,
        refresh: mutate
    };
}
