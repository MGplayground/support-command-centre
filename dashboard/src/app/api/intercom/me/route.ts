import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getIntercomIdFromSession } from '@/lib/admin-config';

const INTERCOM_TOKEN = process.env.VITE_INTERCOM_TOKEN;

async function intercomSearch(query: any) {
    const res = await fetch('https://api.intercom.io/conversations/search', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${INTERCOM_TOKEN}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({ query, pagination: { per_page: 150 } }),
    });
    if (!res.ok) throw new Error(`Intercom API error: ${res.status}`);
    return res.json();
}

function categoriseConversation(conv: any): string {
    const tags: string[] = (conv.tags?.tags || []).map((t: any) => (t.name || '').toLowerCase());
    const state: string = conv.state || 'open';
    if (state === 'snoozed') return 'Snoozed';
    for (const tag of tags) {
        if (tag.includes('t3') || tag.includes('escalat') || tag.includes('engineering')) return 'Raised with T3';
        if (tag.includes('t2') || tag.includes('tier 2')) return 'Raised with T2';
        if (tag.includes('billing') || tag.includes('payment')) return 'Billing';
    }
    return 'Open';
}

function getConversationTitle(conv: any): string {
    // 1. Email subject
    const subject = conv.source?.subject?.trim();
    if (subject && subject.length > 2) return subject;
    // 2. First message body (strip HTML)
    const bodyRaw = conv.source?.body?.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    if (bodyRaw && bodyRaw.length > 3) {
        return bodyRaw.slice(0, 72) + (bodyRaw.length > 72 ? '…' : '');
    }
    // 3. Contact name
    const contactName = conv.source?.author?.name || conv.contacts?.contacts?.[0]?.name;
    if (contactName) return `Chat with ${contactName}`;
    // 4. Fallback
    return `Conversation #${conv.id}`;
}

async function makeIntercomRequest(path: string, bodyObj: any, method: string = 'POST') {
    const res = await fetch(`https://api.intercom.io${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${INTERCOM_TOKEN}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: method === 'POST' ? JSON.stringify(bodyObj) : undefined,
    });
    if (!res.ok) throw new Error(`Intercom API error: ${res.status}`);
    return res.json();
}

const fetchAllPages = async (path: string, initialBody: any, maxPages = 3) => {
    const firstPageBody = { ...initialBody, pagination: { per_page: 150 } };
    let firstPage: any;
    try {
        firstPage = await makeIntercomRequest(path, firstPageBody);
    } catch (e) {
        return { conversations: [], total_count: 0 };
    }
    const arrayKey = firstPage.tickets ? 'tickets' : 'conversations';
    const items: any[] = [...(firstPage[arrayKey] || [])];
    const totalCount = firstPage.total_count || 0;
    if (!firstPage.pages?.next?.starting_after || items.length >= totalCount || maxPages <= 1) {
        return { conversations: items, total_count: totalCount };
    }

    let startingAfter = firstPage.pages.next.starting_after;
    let collected = items;
    const remainingPages = Math.min(maxPages - 1, Math.ceil((totalCount - 150) / 150));

    for (let batch = 0; batch < remainingPages; batch++) {
        if (!startingAfter) break;
        try {
            const pageBody = { ...initialBody, pagination: { per_page: 150, starting_after: startingAfter } };
            const pageResult = await makeIntercomRequest(path, pageBody);
            const pageItems = pageResult[arrayKey] || [];
            collected = [...collected, ...pageItems];
            startingAfter = pageResult.pages?.next?.starting_after;
            if (!startingAfter || pageItems.length === 0) break;
        } catch { break; }
    }
    return { conversations: collected, total_count: Math.max(totalCount, collected.length) };
};

export async function GET(request: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const myAdminId = getIntercomIdFromSession(session);

    if (!INTERCOM_TOKEN) {
        return NextResponse.json({ error: 'INTERCOM_TOKEN not configured' }, { status: 500 });
    }

    try {
        // Fetch Admin Profile Info for the current user
        let adminAvatarUrl = null;
        try {
            const adminsData = await makeIntercomRequest('/admins', {}, 'GET');
            if (adminsData?.admins) {
                const me = adminsData.admins.find((a: any) => String(a.id) === myAdminId || a.email === session?.user?.email);
                if (me?.avatar?.image_url) {
                    adminAvatarUrl = me.avatar.image_url;
                }
            }
        } catch (e) {
            console.warn('[Intercom] Failed to fetch admins for avatar fallback', e);
        }

        const queryOpen = {
            operator: 'AND',
            value: [
                { field: 'state', operator: '=', value: 'open' },
                { field: 'admin_assignee_id', operator: '=', value: myAdminId },
            ],
        };

        const querySnoozed = {
            operator: 'AND',
            value: [
                { field: 'state', operator: '=', value: 'snoozed' },
                { field: 'admin_assignee_id', operator: '=', value: myAdminId },
            ],
        };

        const [openData, snoozedData] = await Promise.all([
            fetchAllPages('/conversations/search', { query: queryOpen }, 1),
            fetchAllPages('/conversations/search', { query: querySnoozed }, 1),
        ]);

        const formatConv = (conv: any) => ({
            id: conv.id,
            subject: getConversationTitle(conv),
            state: conv.state,
            stage: categoriseConversation(conv),
            createdAt: conv.created_at,
            updatedAt: conv.updated_at,
            snoozedUntil: conv.snoozed_until ?? null,
            tags: (conv.tags?.tags || []).map((t: any) => t.name),
            teamId: conv.team_assignee_id ?? null,
            intercomUrl: `https://app.intercom.com/a/inbox/${conv.id}`,
        });

        const openConvs = (openData.conversations || []).map(formatConv);
        const snoozedConvs = (snoozedData.conversations || []).map(formatConv);
        const allConvs = [...openConvs, ...snoozedConvs].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

        return NextResponse.json({
            adminId: myAdminId,
            adminAvatarUrl,
            open: openConvs,
            snoozed: snoozedConvs,
            queue: allConvs,
            openCount: openConvs.length,
            snoozedCount: snoozedConvs.length,
        });
    } catch (err: any) {
        console.error('[/api/intercom/me]', err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
