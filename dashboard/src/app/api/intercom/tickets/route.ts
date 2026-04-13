import { NextResponse } from 'next/server';

export interface TicketStats {
    totalEscalated: number;
    avgDevResponseTime: number; // in hours
    pendingFixes: number;
    trend: number; // % change vs previous week
}

export async function GET() {
    const INTERCOM_TOKEN = process.env.VITE_INTERCOM_TOKEN;

    if (!INTERCOM_TOKEN) {
        return NextResponse.json({ error: 'INTERCOM_TOKEN not configured' }, { status: 500 });
    }

    try {
        const t3TeamId = process.env.TIER_3_TEAM_ID || '7712996';
        const nowDate = new Date();
        // Monday-anchored week start — matches the main dashboard week boundary
        const dayOfWeek = nowDate.getUTCDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startOfThisWeek = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate() - diffToMonday, 0, 0, 0));
        const weekAgo = Math.floor(startOfThisWeek.getTime() / 1000);
        const twoWeeksAgo = weekAgo - (7 * 24 * 60 * 60);

        // Fetch conversations assigned to T3 created in the last 2 weeks
        const response = await fetch('https://api.intercom.io/conversations/search', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${INTERCOM_TOKEN}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Intercom-Version': '2.14',
            },
            body: JSON.stringify({
                query: {
                    operator: 'AND',
                    value: [
                        { field: 'team_assignee_id', operator: '=', value: Number(t3TeamId) },
                        { field: 'created_at', operator: '>', value: twoWeeksAgo }
                    ]
                },
                pagination: { per_page: 100 }
            }),
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Intercom API error: ${response.status}`);
        }

        const data = await response.json();
        const t3Tickets = data.conversations || [];

        // 1. Pending (Open/Snoozed/Unassigned but belonging to team)
        const pendingFixes = t3Tickets.filter((t: any) => t.state === 'open' || t.state === 'snoozed').length;

        // 2. Escalated this week vs last week
        const recentTickets = t3Tickets.filter((t: any) => t.created_at >= weekAgo);
        const prevWeekTickets = t3Tickets.filter((t: any) => t.created_at < weekAgo);

        // 3. Trend percentage
        const trend = prevWeekTickets.length > 0
            ? Math.round(((recentTickets.length - prevWeekTickets.length) / prevWeekTickets.length) * 100)
            : (recentTickets.length > 0 ? 100 : 0);

        // 4. Avg Dev Response Time for this week's tickets (in hours)
        const responseTimes: number[] = [];
        recentTickets.forEach((ticket: any) => {
            const firstReply = ticket.statistics?.first_admin_reply_at;
            if (firstReply && ticket.created_at) {
                const responseTimeHours = (firstReply - ticket.created_at) / 3600;
                if (responseTimeHours > 0 && responseTimeHours < 168) { // Filter outliers (< 1 week)
                    responseTimes.push(responseTimeHours);
                }
            }
        });

        const avgResponseTime = responseTimes.length > 0
            ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
            : 0;

        const stats: TicketStats = {
            totalEscalated: recentTickets.length,
            avgDevResponseTime: avgResponseTime,
            pendingFixes: pendingFixes,
            trend
        };

        return NextResponse.json(stats);

    } catch (error: any) {
        console.error('Tickets API Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch ticket stats', details: error.message },
            { status: 500 }
        );
    }
}
