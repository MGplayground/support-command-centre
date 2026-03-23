'use client';

import { useRef } from 'react';
import { TierType } from '@/lib/intercom-types';
import { getTierConfig } from '@/lib/tier-config';

interface TierToggleProps {
    currentTier: TierType;
    onTierChange: (tier: TierType) => void;
}

// Map tier → API teamId param (must match route.ts keys)
const TIER_TEAM_IDS: Record<TierType, string> = {
    T1: '7096884',
    T2: '7710348',
    T3: '7712996',
    ALL: 'all',
};

export default function TierToggle({ currentTier, onTierChange }: TierToggleProps) {
    const tiers: TierType[] = ['T1', 'T2', 'T3', 'ALL'];
    const prefetchedRef = useRef<Set<TierType>>(new Set());

    // Pre-warm server cache on hover so clicking is near-instant
    const handleMouseEnter = (tier: TierType) => {
        if (tier === currentTier) return;
        if (prefetchedRef.current.has(tier)) return;
        prefetchedRef.current.add(tier);

        const teamId = TIER_TEAM_IDS[tier];
        const url = teamId !== 'all' ? `/api/intercom?teamId=${teamId}` : '/api/intercom';
        // Fire-and-forget — just triggers the server cache warm-up
        fetch(url).catch(() => { });
    };

    return (
        <div className="inline-flex items-center space-x-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
            {tiers.map((tier) => {
                const config = getTierConfig(tier);
                const isActive = currentTier === tier;

                return (
                    <button
                        key={tier}
                        onClick={() => onTierChange(tier)}
                        onMouseEnter={() => handleMouseEnter(tier)}
                        className={`
              px-4 py-2 rounded-md text-sm font-medium transition-all duration-200
              ${isActive
                                ? `bg-${config.color}-600 text-white shadow-lg`
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}`}
                    >
                        {tier}
                    </button>
                );
            })}
        </div>
    );
}
