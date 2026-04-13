
export interface DashboardAnchors {
    now: Date;
    startOfDayTs: number;
    startOfMonthTs: number;
    startOfWeekTs: number;
    startOfPrevWeekTs: number;
    startTimeframeTs: number;
    startOfPrevTimeframeTs: number;
}

export function calculateDashboardAnchors(
    now: Date,
    timeframeParam: string,
    configDays: number
): DashboardAnchors {
    // 1. Fixed Anchors (Today, This Monday, 1st of Month)
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const startOfDayTs = Math.floor(startOfDay.getTime() / 1000);

    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const startOfMonthTs = Math.floor(startOfMonth.getTime() / 1000);

    const dayOfWeek = now.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfThisWeek = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday, 0, 0, 0));
    const startOfWeekTs = Math.floor(startOfThisWeek.getTime() / 1000);
    const startOfPrevWeekTs = startOfWeekTs - (7 * 24 * 60 * 60);

    // 2. Dynamic Timeframe Anchor
    let startTimeframeTs: number;
    let startOfPrevTimeframeTs: number;

    if (timeframeParam === 'current_week') {
        startTimeframeTs = startOfWeekTs;
        startOfPrevTimeframeTs = startOfPrevWeekTs;
    } else {
        const startOfPeriod = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - configDays, 0, 0, 0));
        startTimeframeTs = Math.floor(startOfPeriod.getTime() / 1000);
        startOfPrevTimeframeTs = startTimeframeTs - (configDays * 24 * 60 * 60);
    }

    return {
        now,
        startOfDayTs,
        startOfMonthTs,
        startOfWeekTs,
        startOfPrevWeekTs,
        startTimeframeTs,
        startOfPrevTimeframeTs
    };
}
