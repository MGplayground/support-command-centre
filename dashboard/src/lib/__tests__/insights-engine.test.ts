import { computeInsights } from '../insights-engine';
import { IntercomStats } from '../intercom-types';

// ─── Helpers to build minimal stat objects ──────────────────────────────────

const NOW_TS = Math.floor(Date.now() / 1000);
const TWO_HOURS_AGO = NOW_TS - (2 * 60 * 60) + 100; // just inside the 2h window
const YESTERDAY = NOW_TS - 86400;

const baseStats: IntercomStats = {
    solved: { personal: { week: 10, month: 40, day: 2 }, team: { week: 100, month: 400 } },
    leaderboard: [],
    chatVolume: { closed_month: 0, total: 0, active: 0, unassigned: 0, snoozed: 0, pending: 0 },
    frt: { today: { average: 0, median: 0 }, week: { average: 0, median: 0 } },
    csat: { week: { percentage: 90, positiveRatings: 9, totalRatings: 10, pending: 0, remarks: [] }, month: { percentage: 90, positiveRatings: 9, totalRatings: 10, pending: 0, remarks: [] } },
    lastUpdated: new Date().toISOString(),
    churnRiskAccounts: [],
    weeklyVolume: [],
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('computeInsights - All Clear', () => {
    it('returns a single "all-clear" insight when there are no signals', () => {
        const insights = computeInsights(baseStats);
        expect(insights).toHaveLength(1);
        expect(insights[0].id).toBe('all-clear');
        expect(insights[0].severity).toBe('success');
    });
});

describe('computeInsights - Churn Signals', () => {
    it('fires a "recent-churn" critical alert when a churn account was updated within 2 hours', () => {
        const stats = {
            ...baseStats,
            churnRiskAccounts: [{
                id: '1', customerName: 'Jane Smith', customerEmail: 'jane@example.com',
                review: 'I want to cancel', churnDriver: 'pricing', updatedAt: TWO_HOURS_AGO
            }]
        };
        const insights = computeInsights(stats);
        const insight = insights.find(i => i.id === 'recent-churn');
        expect(insight).toBeDefined();
        expect(insight?.severity).toBe('critical');
        expect(insight?.message).toContain('Jane Smith');
    });

    it('fires a "churn-spike" warning when 3 or more accounts are flagged (but none recent)', () => {
        const stats = {
            ...baseStats,
            churnRiskAccounts: [
                { id: '1', customerName: 'A', customerEmail: 'a@a.com', review: 'bad', churnDriver: 'other', updatedAt: YESTERDAY },
                { id: '2', customerName: 'B', customerEmail: 'b@b.com', review: 'bad', churnDriver: 'other', updatedAt: YESTERDAY },
                { id: '3', customerName: 'C', customerEmail: 'c@c.com', review: 'bad', churnDriver: 'other', updatedAt: YESTERDAY },
            ]
        };
        const insights = computeInsights(stats);
        const insight = insights.find(i => i.id === 'churn-spike');
        expect(insight).toBeDefined();
        expect(insight?.severity).toBe('warning');
    });

    it('does NOT fire churn-spike if fewer than 3 accounts are flagged', () => {
        const stats = {
            ...baseStats,
            churnRiskAccounts: [
                { id: '1', customerName: 'A', customerEmail: 'a@a.com', review: 'bad', churnDriver: 'other', updatedAt: YESTERDAY },
            ]
        };
        const insights = computeInsights(stats);
        expect(insights.find(i => i.id === 'churn-spike')).toBeUndefined();
    });
});

describe('computeInsights - SLA Breach', () => {
    it('fires an "sla-breach" warning when totalBreaches > 0', () => {
        const stats = { ...baseStats, frt: { ...baseStats.frt, totalBreaches: 3 } };
        const insights = computeInsights(stats);
        const insight = insights.find(i => i.id === 'sla-breach');
        expect(insight).toBeDefined();
        expect(insight?.message).toContain('3');
    });

    it('does NOT fire sla-breach when totalBreaches is 0 or undefined', () => {
        const insights = computeInsights(baseStats);
        expect(insights.find(i => i.id === 'sla-breach')).toBeUndefined();
    });
});

describe('computeInsights - Unassigned Queue', () => {
    it('fires an "unassigned-queue" info alert when unassigned >= 5', () => {
        const stats = { ...baseStats, chatVolume: { ...baseStats.chatVolume, unassigned: 7 } };
        const insights = computeInsights(stats);
        const insight = insights.find(i => i.id === 'unassigned-queue');
        expect(insight).toBeDefined();
        expect(insight?.message).toContain('7');
    });

    it('does NOT fire if unassigned is under 5', () => {
        const stats = { ...baseStats, chatVolume: { ...baseStats.chatVolume, unassigned: 4 } };
        const insights = computeInsights(stats);
        expect(insights.find(i => i.id === 'unassigned-queue')).toBeUndefined();
    });
});

describe('computeInsights - Volume Surge', () => {
    it('fires a "volume-surge" info alert when current week is 20% above the average', () => {
        const makeWeek = (label: string, total: number) => ({
            weekLabel: label, weekStartTs: 0, totalCount: total,
            ratedCount: 0, positiveCount: 0, neutralCount: 0, negativeCount: 0
        });
        const stats = {
            ...baseStats,
            weeklyVolume: [
                makeWeek('Week 1', 100),
                makeWeek('Week 2', 100),
                makeWeek('Week 3', 100),
                makeWeek('This Week', 130), // 30% above avg of 100
            ]
        };
        const insights = computeInsights(stats);
        const insight = insights.find(i => i.id === 'volume-surge');
        expect(insight).toBeDefined();
        expect(insight?.message).toContain('%');
    });

    it('does NOT fire if volume is within normal range', () => {
        const makeWeek = (label: string, total: number) => ({
            weekLabel: label, weekStartTs: 0, totalCount: total,
            ratedCount: 0, positiveCount: 0, neutralCount: 0, negativeCount: 0
        });
        const stats = {
            ...baseStats,
            weeklyVolume: [
                makeWeek('Week 1', 100),
                makeWeek('This Week', 105),
            ]
        };
        const insights = computeInsights(stats);
        expect(insights.find(i => i.id === 'volume-surge')).toBeUndefined();
    });
});
