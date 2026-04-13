import { TierType, TierConfig } from './intercom-types';

export const TIER_CONFIGS: Record<TierType, TierConfig> = {
    T1: {
        id: 'T1',
        name: 'Tier 1 Support',
        teamId: '7096884',
        color: 'blue',
        focusMetrics: ['Volume', 'First Response Time', 'Queue Status']
    },
    T2: {
        id: 'T2',
        name: 'Tier 2 Support',
        teamId: '7710348',
        color: 'purple',
        focusMetrics: ['Time to Resolution', 'CSAT', 'Complexity']
    },
    T3: {
        id: 'T3',
        name: 'Tier 3 Development',
        teamId: '7712996',
        color: 'cyan',
        focusMetrics: ['Escalations', 'Dev Response Time', 'Pending Fixes']
    },

    ALL: {
        id: 'ALL',
        name: 'All Teams',
        teamId: '',
        color: 'slate',
        focusMetrics: ['Overall Performance']
    }
};

export function getTierConfig(tier: TierType): TierConfig {
    return TIER_CONFIGS[tier];
}

export function getTierColor(tier: TierType): string {
    const colors: Record<string, string> = {
        'T1': 'text-blue-400',
        'T2': 'text-purple-400',
        'T3': 'text-cyan-400',
        'ALL': 'text-slate-400',
    };
    return colors[tier] || colors['ALL'];
}

export const T1_TEAM_ID = 'T1';
export const T1_AFFILIATED_TEAMS = new Set([7096884, 7708573, 7710041]); // Typical T1 product teams
