import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getWeeklyDrilldownStats } from '@/lib/databricks';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const weekStartTs = parseInt(searchParams.get('weekStartTs') || '0', 10);
    const teamId = searchParams.get('teamId') || null;

    if (!weekStartTs) {
        return NextResponse.json({ error: 'weekStartTs is required' }, { status: 400 });
    }

    try {
        const teamIds = teamId && teamId !== 'all' ? [teamId] : null;

        // Fetch daily aggregates for the chosen week *AND* the 3 weeks prior
        const rawData = await getWeeklyDrilldownStats(teamIds, weekStartTs) || [];

        // We need to bucket the raw data into 7 days (Mon -> Sun)
        // For each day, we attach the count for: currentWeek, prevWeek1, prevWeek2, prevWeek3

        // 1. Initialize our 7-day matrix
        // We use UTC for all date logic
        const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const matrix = daysOfWeek.map(dayName => ({
            dayName,
            dateStr: '', // We'll set this using the current week's actual date
            currentWeek: 0,
            prevWeek1: 0,
            prevWeek2: 0,
            prevWeek3: 0
        }));

        // 2. Distribute data
        rawData.forEach((row: any) => {
            const date = new Date(row.day_start);
            // In JS getUTCDay() Sunday is 0. We want Mon=0, Sun=6.
            const jsDay = date.getUTCDay();
            const matrixIndex = jsDay === 0 ? 6 : jsDay - 1;

            const rowTs = Math.floor(date.getTime() / 1000);
            const daysDiff = Math.floor((weekStartTs - rowTs) / (24 * 60 * 60));

            const val = Number(row.closed_count || 0);

            if (daysDiff <= 0 && daysDiff > -7) {
                // Current Week
                matrix[matrixIndex].currentWeek = val;
                matrix[matrixIndex].dateStr = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
            } else if (daysDiff > 0 && daysDiff <= 7) {
                matrix[matrixIndex].prevWeek1 = val;
            } else if (daysDiff > 7 && daysDiff <= 14) {
                matrix[matrixIndex].prevWeek2 = val;
            } else if (daysDiff > 14 && daysDiff <= 21) {
                matrix[matrixIndex].prevWeek3 = val;
            }
        });

        // 3. Fallback for dateStr if current week has absolutely no data for a day
        matrix.forEach((day, i) => {
            if (!day.dateStr) {
                const targetDate = new Date((weekStartTs + (i * 24 * 60 * 60)) * 1000);
                day.dateStr = targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
            }
        });

        return NextResponse.json({
            daily: matrix
        });
    } catch (error: any) {
        console.error('[Weekly Drilldown Error]', error);
        return NextResponse.json(
            { error: 'Failed to fetch drilldown data', details: error.message },
            { status: 500 }
        );
    }
}
