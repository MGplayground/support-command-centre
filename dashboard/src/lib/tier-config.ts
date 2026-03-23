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
    const colors = {
        T1: 'blue',
        T2: 'purple',
        T3: 'cyan',
        ALL: 'slate'
    };
    return colors[tier];
}
