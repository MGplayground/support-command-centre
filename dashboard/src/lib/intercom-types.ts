export interface IntercomConversation {
    id: string;
    state: 'open' | 'closed' | 'snoozed';
    updated_at: number;
    created_at: number;
    admin_assignee_id: number | null;
    team_id?: number | null;
    conversation_rating?: {
        score?: number;
        remark?: string;
        created_at?: number;
        requested_at?: number;
    };
    statistics?: {
        last_close_at?: number;
        last_closed_by_id?: number | string;
        first_contact_reply_at?: number;
        time_to_first_close?: number;
        time_to_last_close?: number;
    };
    snoozed_until?: number;
    waiting_since?: number;
    teammates?: Array<{ id: string; type: string }>;
}

export type TierType = 'ALL' | 'T1' | 'T2' | 'T3' | '7710348';

export type TimeframeType = 'current_week' | 'past_7_days' | 'past_30_days' | 'past_60_days' | 'past_90_days';

export interface WeeklyVolumeData {
    weekLabel: string;
    weekStartTs: number;
    totalCount: number;
    ratedCount: number;
    positiveCount: number;
    neutralCount: number;
    negativeCount: number;
}

export interface ChurnRiskAccount {
    id: string;
    customerEmail: string;
    customerName: string;
    review: string;
    churnDriver: string;
    updatedAt: number;
}

export interface CommonIssueTheme {
    issue_theme: string;
    frequency: number;
    example_ticket: string;
}

export interface DrilldownConversation {
    id: string;
    agent: string;
    agentAvatar: string | null;
    product: string;
    closedAt: number;
}

export interface TierConfig {
    id: TierType;
    name: string;
    teamId: string;
    color: string;
    focusMetrics: string[];
}

export interface IntercomStats {
    solved: {
        personal: {
            week: number;
            month: number;
            day: number; // Added for completeness
            weekTrend?: number; // % change vs previous week
            monthTrend?: number; // % change vs previous month
        };
        team: {
            week: number;
            month: number;
            weekTrend?: number;
            monthTrend?: number;
        };
    };
    leaderboard: Array<{
        id: string; // Add id back if I messed it up, but the diff showed id was preserved above
        name: string;
        avatar: string | null;
        count: number;
        dailyCount?: number;
        escalatedCount?: number; // NEW FOR T2
    }>;


    chatVolume: {
        closed_month: number;
        total: number;
        active: number;
        unassigned: number;
        snoozed: number;
        pending: number;
        hourlyBreakdown?: Array<{ hour: string; count: number }>;
        recentSolves?: Array<{
            id: string;
            agent: string;
            agentAvatar: string | null;
            timestamp: number;
            product: string;
        }>;
        escalationsToT3?: number; // NEW FOR T2
    };
    weeklyVolume?: WeeklyVolumeData[];
    churnRiskAccounts?: ChurnRiskAccount[];
    commonIssues?: CommonIssueTheme[];
    frt: {
        today: {
            average: number; // in minutes
            median: number;
        };
        week: {
            average: number;
            median: number;
            trend?: number; // % change vs previous week
        };
        slaCompliance?: number; // % of conversations under target
        totalBreaches?: number; // NEW FOR T2
    };
    csat: {
        week: CSATData;
        month: CSATData;
        trend?: number; // % change in satisfaction
    };
    products?: ProductStats[]; // Stats categorized by product
    lastUpdated: string;
}

export interface ProductStats {
    name: string;
    weekSolved: number;
    monthSolved: number;
    csat: number | null;
    csatState?: 'rated' | 'pending';
    csatCount?: number;
    pending: number;
    trend: number;
    leaderboard?: Array<{
        id: string;
        name: string;
        avatar: string | null;
        count: number;
    }>;
}



export interface CSATData {
    percentage: number;
    positiveRatings: number;
    totalRatings: number;
    pending: number;
    remarks: Array<{
        id: string;
        score: number;
        remark: string;
        created_at: number;
        customer: string;
    }>;
}

export interface IntercomError {
    type: string;
    message: string;
}
