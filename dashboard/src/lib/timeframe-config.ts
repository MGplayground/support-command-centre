import { TimeframeType } from './intercom-types';

export interface TimeframeConfig {
    id: TimeframeType;
    name: string;
    days: number; // For calculating the range dynamically on the server
}

export const TIMEFRAME_CONFIGS: Record<TimeframeType, TimeframeConfig> = {
    'current_week': { id: 'current_week', name: 'This Week', days: 7 }, // days is nominal, it means calendar week
    'past_7_days': { id: 'past_7_days', name: 'Past 7 Days', days: 7 },
    'past_30_days': { id: 'past_30_days', name: 'Past 30 Days', days: 30 },
    'past_60_days': { id: 'past_60_days', name: 'Past 60 Days', days: 60 },
    'past_90_days': { id: 'past_90_days', name: 'Past 90 Days', days: 90 },
};

export const getTimeframeConfig = (id: TimeframeType): TimeframeConfig => {
    return TIMEFRAME_CONFIGS[id] || TIMEFRAME_CONFIGS['current_week'];
};
