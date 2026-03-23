'use client';

import useSWR from 'swr';
import { IntercomStats, TierType } from '@/lib/intercom-types';
import { getTierConfig } from '@/lib/tier-config';
import { useEffect, useState } from 'react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

    const { data, error, isLoading, mutate } = useSWR<IntercomStats>(
        enabled ? url : null,
        fetcher,
        {
            refreshInterval: effectiveRefreshInterval,
            revalidateOnFocus: true,
            dedupingInterval: 5000,
            keepPreviousData: true, // Show previous tier's data while new tier loads
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
        isError: error,
        refresh: mutate
    };
}
