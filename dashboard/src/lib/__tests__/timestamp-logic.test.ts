
import { calculateDashboardAnchors } from '../temporal';

describe('calculateDashboardAnchors', () => {
    beforeAll(() => {
        jest.useFakeTimers();
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('calculates correct Monday boundary (Wednesday to Monday)', () => {
        // Wednesday April 1st, 2026, 12:00:00 UTC
        const now = new Date(Date.UTC(2026, 3, 1, 12, 0, 0));
        jest.setSystemTime(now);

        const anchors = calculateDashboardAnchors(now, 'current_week', 7);

        // Monday March 30th, 2026
        expect(new Date(anchors.startOfWeekTs * 1000).toISOString()).toBe('2026-03-30T00:00:00.000Z');
        expect(new Date(anchors.startOfMonthTs * 1000).toISOString()).toBe('2026-04-01T00:00:00.000Z');
        expect(new Date(anchors.startOfDayTs * 1000).toISOString()).toBe('2026-04-01T00:00:00.000Z');
    });

    it('calculates correct Monday boundary (Sunday to Monday)', () => {
        // Sunday April 5th, 2026, 23:59:59 UTC
        const now = new Date(Date.UTC(2026, 3, 5, 23, 59, 59));
        jest.setSystemTime(now);

        const anchors = calculateDashboardAnchors(now, 'current_week', 7);

        // Monday March 30th (Still the same week)
        expect(new Date(anchors.startOfWeekTs * 1000).toISOString()).toBe('2026-03-30T00:00:00.000Z');
    });

    it('calculates correct Monday boundary (Monday Morning)', () => {
        // Monday April 6th, 2026, 00:00:01 UTC
        const now = new Date(Date.UTC(2026, 3, 6, 0, 0, 1));
        jest.setSystemTime(now);

        const anchors = calculateDashboardAnchors(now, 'current_week', 7);

        // Monday April 6th
        expect(new Date(anchors.startOfWeekTs * 1000).toISOString()).toBe('2026-04-06T00:00:00.000Z');
    });

    it('handles Month boundary correctly (Late night March 31st)', () => {
        const now = new Date(Date.UTC(2026, 2, 31, 23, 59, 59));
        jest.setSystemTime(now);

        const anchors = calculateDashboardAnchors(now, 'current_week', 7);

        expect(new Date(anchors.startOfMonthTs * 1000).toISOString()).toBe('2026-03-01T00:00:00.000Z');
        expect(new Date(anchors.startOfDayTs * 1000).toISOString()).toBe('2026-03-31T00:00:00.000Z');
    });

    it('separates timeframe from week when timeframe is past_30_days', () => {
        const now = new Date(Date.UTC(2026, 3, 1, 12, 0, 0));
        jest.setSystemTime(now);

        const anchors = calculateDashboardAnchors(now, 'past_30_days', 30);

        // Week is still Monday March 30th
        expect(new Date(anchors.startOfWeekTs * 1000).toISOString()).toBe('2026-03-30T00:00:00.000Z');
        // Timeframe is March 2nd (30 days before April 1st)
        expect(new Date(anchors.startTimeframeTs * 1000).toISOString()).toBe('2026-03-02T00:00:00.000Z');
    });
});
