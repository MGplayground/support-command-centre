
import { calculateDashboardAnchors } from '../temporal';

// Mimic the fallback logic in route.ts
function computeFallbackCounts(conversations: any[], anchors: any, ticketWeekCount: number) {
    const { startOfMonthTs, startOfWeekTs, startTimeframeTs, startOfDayTs } = anchors;
    
    const teamMonthCountTotal = conversations.filter((c: any) => (c.statistics?.last_close_at || c.updated_at) > startOfMonthTs).length + (ticketWeekCount > 0 ? Math.floor(ticketWeekCount * 4) : 0);
    const teamWeekCountTotal = conversations.filter((c: any) => (c.statistics?.last_close_at || c.updated_at) > startOfWeekTs).length + ticketWeekCount;
    const teamDayCountTotal = conversations.filter((c: any) => (c.statistics?.last_close_at || c.updated_at) > startOfDayTs).length + (ticketWeekCount > 0 ? Math.floor(ticketWeekCount / 5) : 0);
    const teamTimeframeCountTotal = conversations.filter((c: any) => (c.statistics?.last_close_at || c.updated_at) > startTimeframeTs).length + ticketWeekCount;

    return {
        day: teamDayCountTotal,
        week: teamWeekCountTotal,
        month: teamMonthCountTotal,
        timeframe: teamTimeframeCountTotal
    };
}

describe('Fallback Calculation Logic', () => {
    const now = new Date(Date.UTC(2026, 3, 1, 12, 0, 0)); // Wed April 1st
    const anchors = calculateDashboardAnchors(now, 'past_30_days', 30);
    // anchors.startOfMonthTs = April 1st 00:00
    // anchors.startOfWeekTs = March 30th 00:00
    // anchors.startTimeframeTs = March 2nd 00:00

    const mockConversations = [
        { id: '1', updated_at: Math.floor(now.getTime() / 1000) - 3600 }, // Today (April 1st)
        { id: '2', updated_at: Math.floor(now.getTime() / 1000) - 86400 * 1.5 }, // Monday (March 30th/31st)
        { id: '3', updated_at: Math.floor(now.getTime() / 1000) - 86400 * 5 }, // Last Week (March 27th)
        { id: '4', updated_at: Math.floor(now.getTime() / 1000) - 86400 * 15 }, // 15 Days Ago (Mid March)
        { id: '5', updated_at: Math.floor(now.getTime() / 1000) - 86400 * 25 }, // 25 Days Ago (Early March)
    ];

    it('calculates correct stable counts from raw data for all anchors', () => {
        const counts = computeFallbackCounts(mockConversations, anchors, 0);

        // Day should only be item 1
        expect(counts.day).toBe(1);
        // Week (Mon-Wed) should be item 1 and 2
        expect(counts.week).toBe(2);
        // Month (April 1st 00:00) should only be item 1
        expect(counts.month).toBe(1);
        // Timeframe (30 days) should be all 5
        expect(counts.timeframe).toBe(5);
    });

    it('excludes old items from the counts accurately', () => {
        const legacyConv = [
            { id: 'old', updated_at: anchors.startTimeframeTs - 1 }
        ];
        const counts = computeFallbackCounts(legacyConv, anchors, 0);
        expect(counts.timeframe).toBe(0);
    });
});
