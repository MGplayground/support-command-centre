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

export type TierType = 'ALL' | 'T1' | 'T2' | 'T3';

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
            day: number;
            week: number;
            month: number;
            timeframe: number;
            weekTrend?: number;
            monthTrend?: number;
        };
        team: {
            day: number;
            week: number;
            month: number;
            timeframe: number;
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
        newThisWeek?: number;      // ← newly opened this week
        handoverCount?: number;    // ← convs handed between teams
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
        escalationsToT3?: number;
    };
    weeklyVolume?: WeeklyVolumeData[];
    churnRiskAccounts?: ChurnRiskAccount[];
    commonIssues?: CommonIssueTheme[];
    frt: {
        today: {
            average: number;
            median: number;
        };
        week: {
            average: number;
            median: number;
            trend?: number;
        };
        slaCompliance?: number;
        totalBreaches?: number;
        avgResolutionTime?: number; // avg seconds from open → close
        medianReplyTime?: number;   // median_time_to_reply across week convs
    };
    csat: {
        week: CSATData;
        month: CSATData;
        trend?: number; // % change in satisfaction
    };
    products?: ProductStats[]; // Stats categorized by product
    source: 'databricks' | 'intercom_fallback';
    _diagnostics: {
        anchors: {
            today: string;
            week: string;
            month: string;
            timeframe: string;
        };
        fingerprints?: {
            week: number;
            month: number;
        };
        counts: {
            team: {
                day: number;
                week: number;
                month: number;
                timeframe: number;
            };
        };
    };
    lastUpdated: string;
    cacheVersion?: number;
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
    excluded?: number;  // conversations filtered out by exclusion tags
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
