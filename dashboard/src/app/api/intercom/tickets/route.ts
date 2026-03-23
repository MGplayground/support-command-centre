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
        // Fetch tickets from Intercom
        const response = await fetch('https://api.intercom.io/tickets', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${INTERCOM_TOKEN}`,
                'Accept': 'application/json',
                'Intercom-Version': '2.14',
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Tickets API error: ${response.status}`);
        }

        const data = await response.json();
        const tickets = data.tickets || [];

        // Get T3 team ID from env
        const t3TeamId = process.env.TIER_3_TEAM_ID || '7712996';

        // Filter for T3/Development tickets
        const t3Tickets = tickets.filter((ticket: any) =>
            ticket.team_id === parseInt(t3TeamId) ||
            ticket.category === 'back_office' ||
            ticket.category === 'bug'
        );

        // Calculate metrics
        const now = Date.now() / 1000;
        const weekAgo = now - (7 * 24 * 60 * 60);

        const openTickets = t3Tickets.filter((t: any) => t.state === 'open' || t.state === 'in_progress');
        const recentTickets = t3Tickets.filter((t: any) => t.created_at > weekAgo);

        // Calculate average dev response time
        const responseTimes: number[] = [];
        t3Tickets.forEach((ticket: any) => {
            if (ticket.first_response_at && ticket.created_at) {
                const responseTimeHours = (ticket.first_response_at - ticket.created_at) / 3600;
                if (responseTimeHours > 0 && responseTimeHours < 168) { // Filter outliers (< 1 week)
                    responseTimes.push(responseTimeHours);
                }
            }
        });

        const avgResponseTime = responseTimes.length > 0
            ? Math.round((responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length) * 10) / 10
            : 0;

        // Calculate trend (compare to previous week)
        const twoWeeksAgo = weekAgo - (7 * 24 * 60 * 60);
        const prevWeekTickets = t3Tickets.filter((t: any) => t.created_at > twoWeeksAgo && t.created_at < weekAgo);

        const trend = prevWeekTickets.length > 0
            ? Math.round(((recentTickets.length - prevWeekTickets.length) / prevWeekTickets.length) * 100)
            : 0;

        const stats: TicketStats = {
            totalEscalated: recentTickets.length,
            avgDevResponseTime: avgResponseTime,
            pendingFixes: openTickets.length,
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
