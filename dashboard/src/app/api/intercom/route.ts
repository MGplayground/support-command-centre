import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { IntercomStats, IntercomConversation } from '@/lib/intercom-types';
import { getDatabricksStats, getWeeklyVolumeWithSentiment, getChurnRiskAccounts, getCommonIssuesBreakdown } from '@/lib/databricks';
import { readDiskCache, writeDiskCache, getCachedStats, getCachedPrevWeek, setCachedStats, setCachedPrevWeek } from '@/lib/disk-cache';
import type { } from '@/lib/disk-cache';
import { TAG_ID_TO_PRODUCT, T1_AFFILIATED_TEAM_IDS, PRODUCT_CONFIGS } from '@/lib/product-config';
import { TimeframeType } from '@/lib/intercom-types';
import { getTimeframeConfig } from '@/lib/timeframe-config';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getIntercomIdFromSession } from '@/lib/admin-config';

// Cache structure per tier
let cache: Record<string, {
    data: IntercomStats | null;
    lastFetch: number;
    isFetching?: boolean;
}> = {};

const CACHE_TTL = 5 * 60 * 1000;      // 5 minutes: serve fresh from cache
const STALE_TTL = 24 * 60 * 60 * 1000; // 24 hours: ALWAYS serve stale data if it exists while refreshing
const PREV_WEEK_CACHE_TTL = 60 * 60 * 1000; // 1 hour: prev-week data is historical, rarely changes

// Separate cache for prev-week trend data (historical, long-lived)
let prevWeekCache: Record<string, { data: any; lastFetch: number }> = {};

// Disk cache state — hydrated once on first request
let diskState = { stats: {}, prevWeek: {}, savedAt: 0 } as any;
let diskHydrated = false;

async function ensureDiskHydration() {
    if (diskHydrated) return;
    diskHydrated = true;
    diskState = await readDiskCache();

    // Hydrate in-memory caches from disk
    for (const [key, entry] of Object.entries(diskState.stats || {})) {
        const e = entry as any;
        if (e?.data && !cache[key]?.data) {
            cache[key] = { data: e.data, lastFetch: e.savedAt || 0, isFetching: false };
        }
    }
    for (const [key, entry] of Object.entries(diskState.prevWeek || {})) {
        const e = entry as any;
        if (e?.data && !prevWeekCache[key]) {
            prevWeekCache[key] = { data: e.data, lastFetch: e.savedAt || 0 };
        }
    }
}

// Background Warmup: Proactively refresh prime tiers every 50 minutes
async function startBackgroundWarmup() {
    console.log('[API/Intercom] Initializing Background Warmup Worker...');

    const primeTiers = [
        { teamId: 'all', timeframe: 'current_week' as TimeframeType },
        { teamId: '7096884', timeframe: 'current_week' as TimeframeType } // T1 Support
    ];

    const runWarmupCycle = async () => {
        await ensureDiskHydration();

        for (const tier of primeTiers) {
            const cacheKey = `${tier.teamId}:${tier.timeframe}`;
            const cached = cache[cacheKey];

            // Criteria for warmup:
            // 1. Missing data OR older than 50 minutes
            // 2. Not currently fetching (either from worker or user)
            const isStale = !cached?.data || (Date.now() - cached.lastFetch > 50 * 60 * 1000);

            if (isStale && !cached?.isFetching) {
                console.log(`[API/Intercom] Warmup: Proactively refreshing ${cacheKey}...`);
                if (!cache[cacheKey]) cache[cacheKey] = { data: null, lastFetch: 0, isFetching: true };
                else cache[cacheKey].isFetching = true;

                try {
                    const stats = await fetchIntercomStats(
                        tier.teamId === 'all' ? null : tier.teamId,
                        tier.timeframe,
                        null,
                        '7706965' // Mauro's ID
                    );
                    cache[cacheKey] = { data: stats, lastFetch: Date.now(), isFetching: false };

                    // Persist to disk using aligned cacheKey
                    diskState = setCachedStats(diskState, cacheKey, stats);
                    await writeDiskCache(diskState);
                    console.log(`[API/Intercom] Warmup: ${cacheKey} successfully refreshed.`);
                } catch (e) {
                    console.error(`[API/Intercom] Warmup failed for ${cacheKey}:`, e);
                    if (cache[cacheKey]) cache[cacheKey].isFetching = false;
                }
            }
        }

        // Schedule next check in 10 minutes (short check interval, long TTL)
        setTimeout(runWarmupCycle, 10 * 60 * 1000);
    };

    runWarmupCycle();
}

// Kick off hydration and warmup loop on module load
ensureDiskHydration().then(() => startBackgroundWarmup());

export async function GET(request: NextRequest) {
    console.log('[API/Intercom] Request initiated for URL:', request.nextUrl.toString());
    const searchParams = request.nextUrl.searchParams;
    const teamId = searchParams.get('teamId') || 'all';
    const timeframeParam = (searchParams.get('timeframe') as TimeframeType) || 'current_week';
    const isLightweight = searchParams.get('lightweight') === 'true';
    const timeframeConfig = getTimeframeConfig(timeframeParam);

    // Cache key includes tier, timeframe, AND lightweight flag
    const cacheKey = `${teamId}:${timeframeParam}${isLightweight ? ':light' : ''}`;

    // Get current authenticated user
    const session = await getServerSession(authOptions);
    const myAdminId = getIntercomIdFromSession(session);
    console.log(`[API/Intercom] Session validated for admin: ${myAdminId}. Checking cache...`);

    // Hydrate from disk on first request (reboot recovery)
    await ensureDiskHydration();

    const now = Date.now();
    const cached = cache[cacheKey];

    // 1. Fully fresh — return immediately
    if (cached?.data && (now - cached.lastFetch < CACHE_TTL)) {
        console.log(`[API/Intercom] [Block 1] Fresh Hit for ${cacheKey}. Churn: ${cached.data.churnRiskAccounts?.length || 0}`);
        return NextResponse.json(cached.data);
    }

    // 2. Stale but usable — serve cached data immediately, refresh in background
    if (cached?.data && (now - cached.lastFetch < STALE_TTL) && !cached.isFetching) {
        console.log(`[API/Intercom] [Block 2] Stale Hit for ${cacheKey}. Triggering BG refresh.`);
        cache[cacheKey].isFetching = true;
        // Fire-and-forget background refresh
        fetchIntercomStats(teamId !== 'all' ? teamId : null, timeframeParam, timeframeConfig, myAdminId, isLightweight)
            .then(stats => {
                cache[cacheKey] = { data: stats, lastFetch: Date.now(), isFetching: false };
                console.log(`[API/Intercom] BG Refresh complete for ${cacheKey}`);
            })
            .catch(err => {
                console.error(`[Intercom] Background refresh failed for ${cacheKey}:`, err);
                if (cache[cacheKey]) cache[cacheKey].isFetching = false;
            });
        return NextResponse.json(cached.data);
    }

    // 3. No cache or too stale — must fetch synchronously (first load)
    try {
        if (cached?.isFetching && cached.data) {
            console.log(`[API/Intercom] [Block 2b] Fetching in progress, serving STALE for ${cacheKey}`);
            return NextResponse.json(cached.data);
        }

        console.log(`[API/Intercom] [Block 3] Synchronous Fetch for ${cacheKey}`);
        if (!cache[cacheKey]) cache[cacheKey] = { data: null, lastFetch: 0, isFetching: true };
        else cache[cacheKey].isFetching = true;

        const stats = await fetchIntercomStats(teamId !== 'all' ? teamId : null, timeframeParam, timeframeConfig, myAdminId, isLightweight);
        cache[cacheKey] = { data: stats, lastFetch: Date.now(), isFetching: false };

        // Persist full stats to disk
        if (!isLightweight) {
            diskState = setCachedStats(diskState, cacheKey, stats);
            writeDiskCache(diskState).catch(() => { });
        }

        console.log(`[API/Intercom] Sending response for ${cacheKey}. Churn accounts: ${stats.churnRiskAccounts?.length || 0}`);
        return NextResponse.json(stats);
    } catch (error: any) {
        if (cache[cacheKey]) cache[cacheKey].isFetching = false;
        if (cached?.data) {
            console.warn('[Intercom] Fetch failed, serving stale data:', error.message);
            return NextResponse.json(cached.data);
        }
        console.error('Intercom Handler Error:', error);
        return NextResponse.json({ error: 'Failed to fetch Intercom stats', details: error.message }, { status: 500 });
    }
}

async function fetchIntercomStats(
    teamId: string | null = null,
    timeframeParam: TimeframeType = 'current_week',
    timeframeConfig: any = null,
    myAdminId: string = '7706965',
    isLightweight: boolean = false
): Promise<IntercomStats> {
    const config = timeframeConfig || getTimeframeConfig(timeframeParam);
    const INTERCOM_TOKEN = process.env.VITE_INTERCOM_TOKEN;

    if (!INTERCOM_TOKEN) {
        throw new Error('INTERCOM_TOKEN not configured');
    }

    // ── fetchCount: get total_count only (per_page:1) — much faster than fetching all pages ──
    const fetchCount = async (path: string, query: any): Promise<number> => {
        try {
            const result = await makeIntercomRequest(path, { query, pagination: { per_page: 1 } });
            return result.total_count || 0;
        } catch {
            return 0;
        }
    };

    // ── fetchAllPages: paginate results when we need actual conversation objects ──
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
        // Strictly limit the remaining pages loop to maxPages - 1
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

    // Helper function to filter conversations by team (LEGACY: Moving to server-side query)
    const filterByTeam = (conversations: any[]) => {
        if (!teamId) return conversations;

        const isT1Filter = teamId === T1_TEAM_ID;

        const filtered = conversations.filter((conv: any) => {
            // Tickets are pre-filtered by the API query, so allow them through safely
            if (conv.is_ticket) return true;

            // T1: check if the conversation belongs to ANY T1-affiliated team
            if (isT1Filter) {
                const convTeam = conv.team_assignee_id ? Number(conv.team_assignee_id) : null;
                return convTeam !== null && T1_AFFILIATED_TEAMS.has(convTeam);
            }

            // T2, T3: exact match
            const targetTeamId = Number(teamId);
            return conv.team_assignee_id && Number(conv.team_assignee_id) === targetTeamId;
        });


        return filtered;
    };

    // Fetch admin list from Intercom for accurate names and avatars
    const adminMap = new Map<string, { name: string; email?: string; avatar: string | null; team_ids: number[] }>();

    try {
        const adminsData = await makeIntercomRequest('/admins', {}, 'GET');
        if (adminsData?.admins) {
            adminsData.admins.forEach((admin: any) => {
                adminMap.set(String(admin.id), {
                    name: admin.name,
                    email: admin.email,
                    avatar: admin.avatar?.image_url || null,
                    team_ids: admin.team_ids || []
                });
            });

        }
    } catch (e) {
        console.warn('[Intercom] Failed to fetch admins, using anonymous names', e);
    }

    const now = new Date();

    // ── Timezone-aware date boundaries (all UTC) ──────────────────────
    // Using UTC ensures consistent boundaries regardless of server timezone.

    let startOfWeekTs: number;
    let startOfPrevWeekTs: number;

    if (timeframeParam === 'current_week') {
        const dayOfWeek = now.getUTCDay();
        const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const startOfWeek = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diffToMonday, 0, 0, 0
        ));
        startOfWeekTs = Math.floor(startOfWeek.getTime() / 1000);
        startOfPrevWeekTs = startOfWeekTs - (7 * 24 * 60 * 60);
    } else {
        const startOfPeriod = new Date(Date.UTC(
            now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - config.days, 0, 0, 0
        ));
        startOfWeekTs = Math.floor(startOfPeriod.getTime() / 1000);
        startOfPrevWeekTs = startOfWeekTs - (config.days * 24 * 60 * 60);
    }

    // Start of Month (1st 00:00 UTC)
    // Month remains static so "Team Solves (Month)" always acts as a baseline anchor
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const startOfMonthTs = Math.floor(startOfMonth.getTime() / 1000);

    // Helper to build queries with Server-Side Team Filtering
    const buildSolveQuery = (sinceTs: number, adminId: string | null = null) => {
        const rules: any[] = [
            { field: 'state', operator: '=', value: 'closed' },
            { field: 'updated_at', operator: '>', value: sinceTs }
        ];

        if (adminId) {
            rules.push({ field: 'statistics.last_closed_by_id', operator: '=', value: adminId });
        }

        // For T1: don't add API-level team filter (T1 spans multiple product teams)
        // We'll filter in-memory using T1_AFFILIATED_TEAMS
        // For T2, T3: single team, use API filter
        if (teamId && teamId !== 'all' && teamId !== T1_TEAM_ID) {
            rules.push({ field: 'team_assignee_id', operator: '=', value: Number(teamId) });
        }

        return { operator: 'AND', value: rules };
    };

    const buildCsatQuery = (sinceTs: number) => {
        const rules: any[] = [
            { field: 'conversation_rating.requested_at', operator: '>', value: sinceTs }
        ];

        if (teamId && teamId !== 'all' && teamId !== T1_TEAM_ID) {
            rules.push({ field: 'team_assignee_id', operator: '=', value: Number(teamId) });
        }

        return { operator: 'AND', value: rules };
    };

    const buildUnassignedQuery = () => {
        const rules: any[] = [
            { field: 'state', operator: '=', value: 'open' },
            { field: 'admin_assignee_id', operator: '=', value: 0 }
        ];

        if (teamId && teamId !== 'all' && teamId !== T1_TEAM_ID) {
            rules.push({ field: 'team_assignee_id', operator: '=', value: Number(teamId) });
        }

        return { operator: 'AND', value: rules };
    };

    // Tier team IDs (from tier-config.ts)
    const T1_TEAM_ID = '7096884';
    const T2_TEAM_ID = '7710348';
    const T3_TEAM_ID = '7712996'; // NEW

    // T1 team IDs imported from product-config.ts (verified against Intercom /teams API)
    const T1_AFFILIATED_TEAMS = T1_AFFILIATED_TEAM_IDS;

    // Determine fetch strategy based on tier:
    // ALL = conversations + tickets combined
    // T1  = conversations only
    // T2  = tickets only
    // T3  = conversations (escalations)
    const isT2 = teamId === T2_TEAM_ID;
    const fetchConversations = !isT2;  // skip convos for T2
    const fetchTickets = teamId === 'all' || isT2; // fetch tickets ONLY for ALL or T2

    // Helper: build resolved ticket query
    const buildTicketQuery = (sinceTs: number) => {
        const rules: any[] = [
            { field: 'state', operator: '=', value: 'resolved' },
            { field: 'updated_at', operator: '>', value: sinceTs }
        ];
        if (teamId && teamId !== 'all') {
            rules.push({ field: 'team_assignee_id', operator: '=', value: Number(teamId) });
        }
        return { operator: 'AND', value: rules };
    };

    // Task Definitions - Increased pagination to capture all team conversations

    const prevWeekQuery = {
        operator: 'AND',
        value: [
            { field: 'state', operator: '=', value: 'closed' },
            { field: 'updated_at', operator: '>', value: startOfPrevWeekTs },
            { field: 'updated_at', operator: '<', value: startOfWeekTs }
        ]
    };

    const isT1 = teamId === T1_TEAM_ID;

    // ----- [DATABRICKS] Massive Query computes Month/Week/PrevWeek/CSAT fast! -----
    const targetTeams = isT1
        ? Array.from(T1_AFFILIATED_TEAMS).map(String)
        : [teamId === 'all' ? null : teamId].filter(Boolean) as string[];

    console.log(`\n[Dashboard] Fetching Databricks Aggregates for tier: ${teamId || 'ALL'}`);
    const dbStatsPromise = getDatabricksStats(
        targetTeams.length > 0 ? targetTeams : null,
        startOfMonthTs,
        startOfWeekTs,
        startOfPrevWeekTs,
        myAdminId
    ).catch(e => {
        console.error('[Databricks Error]', e);
        return null;
    });

    // Fetch weekly volume with AI sentiment (runs in parallel)
    const weeklyVolumePromise = isLightweight ? Promise.resolve([]) : getWeeklyVolumeWithSentiment(
        targetTeams.length > 0 ? targetTeams : null,
        8 // Fetch 8 weeks of history
    ).catch(e => {
        console.error('[Databricks Weekly Error]', e);
        return [];
    });

    // Fetch account churn risk using AI classification
    const churnRiskPromise = isLightweight ? Promise.resolve([]) : getChurnRiskAccounts(
        targetTeams.length > 0 ? targetTeams : null,
        10
    ).catch(e => {
        console.error('[Databricks Churn Risk Error]', e);
        return [];
    });

    // Fetch common issue themes using AI classification
    const commonIssuesPromise = isLightweight ? Promise.resolve([]) : getCommonIssuesBreakdown(
        5 // Top 5 themes
    ).catch(e => {
        console.error('[Databricks Common Issues Error]', e);
        return [];
    });

    // ----- [INTERCOM API] Fetch objects for Current Week to power Leaderboards & Recent list -----
    // By only fetching the current week (and at most 3 pages), we drop loading times immensely!
    const tasks = [
        // [0] Team WEEK conversations (Only fetching current week for Leaderboards/Products objects)
        fetchConversations
            ? () => fetchAllPages('/conversations/search', { query: buildSolveQuery(startOfWeekTs) }, 3)
            : () => Promise.resolve({ total_count: 0, conversations: [] }),

        // [1] CSAT WEEK conversations (Only fetching current week for CSAT Remarks)
        () => fetchAllPages('/conversations/search', { query: buildCsatQuery(startOfWeekTs) }, 3),

        // [2] My personal solves WEEK
        () => fetchAllPages('/conversations/search', { query: buildSolveQuery(startOfWeekTs, myAdminId) }, 2),

        // [3] My active conversations (Keep the same)
        () => fetchAllPages('/conversations/search', {
            query: {
                operator: 'AND',
                value: [
                    { field: 'state', operator: '=', value: 'open' },
                    { field: 'admin_assignee_id', operator: '=', value: myAdminId }
                ]
            }
        }),

        // [4] Prev week conversations — STILL NEEDED for FRT Trends! Just need the FRT numbers so 3 pages is fine.
        () => {
            const prevCacheKey = `prevWeek_${teamId || 'all'}`;
            const diskCached = getCachedPrevWeek(diskState, prevCacheKey);
            if (diskCached) return Promise.resolve(diskCached);

            return fetchAllPages('/conversations/search', { query: prevWeekQuery }, 3).then(result => {
                // Persist to disk for reboot recovery
                diskState = setCachedPrevWeek(diskState, prevCacheKey, result);
                writeDiskCache(diskState).catch(() => { });
                return result;
            });
        },

        // [5] Team WEEK resolved TICKETS (ALL and T2 only)
        fetchTickets
            ? () => fetchAllPages('/tickets/search', { query: buildTicketQuery(startOfWeekTs) }, 3)
            : () => Promise.resolve({ total_count: 0, conversations: [] }),

        // [6] Unassigned count (REAL-TIME)
        () => fetchCount('/conversations/search', buildUnassignedQuery()),
        
        // [7] T3 Escalated Tickets (For T2 context)
        isT2 ? () => fetchAllPages('/tickets/search', {
            query: {
                operator: 'AND',
                value: [
                    { field: 'team_assignee_id', operator: '=', value: Number(T3_TEAM_ID) },
                    { field: 'created_at', operator: '>', value: startOfWeekTs }
                ]
            }
        }, 3) : () => Promise.resolve({ total_count: 0, tickets: [] })
    ];

    // ----- [DATABRICKS] Execute heavy queries SEQUENTIALLY to avoid resource contention -----
    console.log(`[API/Intercom] Starting Databricks sequence for ${teamId}:${timeframeParam}...`);

    console.log(`[API/Intercom] Awaiting Databricks and Intercom tasks...`);
    const [
        dbStats,
        weeklyVolume,
        churnRiskAccounts,
        commonIssues,
        teamWeekRaw,
        csatWeekObjRaw,
        myWeekRaw,
        myActiveRaw,
        prevWeekRaw,
        ticketWeekRaw,
        unassignedCount,
        t3Raw
    ] = await Promise.all([
        dbStatsPromise,
        weeklyVolumePromise,
        churnRiskPromise,
        commonIssuesPromise,
        ...tasks.map(t => t().catch(() => ({ total_count: 0, conversations: [], tickets: [] } as any)))
    ]);

    console.log(`[Diagnostic] churnRiskAccounts payload size:`, churnRiskAccounts ? (churnRiskAccounts as any).length : 'undefined/null');
    console.log(`[Diagnostic] weeklyVolume payload size:`, weeklyVolume ? (weeklyVolume as any).length : 'undefined/null');

    // Resolved TICKETS this week
    const resolvedTickets = (ticketWeekRaw as any).conversations || [];
    // Databricks accurately counts month tickets in team_month_solves
    const ticketWeekCount = resolvedTickets.filter((t: any) => (t.updated_at || 0) > startOfWeekTs).length;



    // Normalize tickets to look like standard conversations so they work with existing UI/Stats logic
    const normalizedTickets = resolvedTickets.map((t: any) => {
        let closerId = null;
        let firstReplyAt = null;

        if (t.ticket_parts && t.ticket_parts.ticket_parts) {
            const parts = t.ticket_parts.ticket_parts;

            // Find closer (last admin who resolved the ticket)
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                if (p.part_type === 'ticket_state_updated_by_admin' && p.ticket_state === 'resolved' && p.author?.type === 'admin') {
                    closerId = p.author.id;
                    break;
                }
            }
            if (!closerId) {
                // Fallback: any admin action near the end
                for (let i = parts.length - 1; i >= 0; i--) {
                    const p = parts[i];
                    if (p.author?.type === 'admin') {
                        closerId = p.author.id;
                        break;
                    }
                }
            }

            // Find first reply
            for (let i = 0; i < parts.length; i++) {
                const p = parts[i];
                if (p.author?.type === 'admin' && (p.part_type === 'note' || p.part_type === 'comment')) {
                    firstReplyAt = p.created_at;
                    break;
                }
            }
        }

        return {
            ...t,
            id: t.id,
            is_ticket: true,
            statistics: {
                last_close_at: t.updated_at,
                first_admin_reply_at: firstReplyAt || t.created_at,
                last_closed_by_id: closerId || null
            }
        };
    });

    // Process Conversation & Ticket Data into a single unified stream
    const combinedTeamData = [
        ...(teamWeekRaw.conversations || []),
        ...normalizedTickets
    ];

    let teamConversations = filterByTeam(combinedTeamData);

    // Deduplicate by conversation/ticket ID to prevent re-opens inflating counts
    const seenIds = new Set<string>();
    teamConversations = teamConversations.filter((c: any) => {
        const id = String(c.id);
        if (seenIds.has(id)) return false;
        seenIds.add(id);
        return true;
    });

    // Filter for Week
    const teamWeekConversations = teamConversations.filter((c: any) => {
        const closedAt = c.statistics?.last_close_at || c.updated_at;
        return closedAt > startOfWeekTs;
    });

    // TOTAL TEAM SOLVES
    const teamMonthCountTotal = dbStats ? Number((dbStats as any).team_month_solves || 0) : teamConversations.length + ticketWeekCount;
    const teamWeekCountTotal = dbStats ? Number((dbStats as any).team_week_solves || 0) : teamWeekConversations.length + ticketWeekCount;

    // Process Personal Data
    const myConversations = myWeekRaw.conversations || [];
    const myWeekConversations = myConversations.filter((c: any) => {
        const closedAt = c.statistics?.last_close_at || c.updated_at;
        return closedAt > startOfWeekTs;
    });

    // ----- [TIER 2 SPECIFIC METRICS: T3 ESCALATIONS] -----
    let totalEscalationsToT3 = 0;
    let personalEscalationsToT3 = 0;
    const t2EscalationsByAgent: Record<string, number> = {};

    if (isT2) {
        const t3Tickets = (t3Raw as any).tickets || [];
        totalEscalationsToT3 = t3Tickets.length;

        // Attribute escalations to T2 agents who created the T3 ticket
        // T3 tickets usually have "admin_assignee_id" set to the T3 owner,
        // but the creator/linked_objects reveal the T2 agent.
        // For hackathon simplicity, we'll try to find an admin id in the contacts/creator,
        // or default to parsing the first ticket note if available via list.
        t3Tickets.forEach((t: any) => {
             // In Intercom tickets, created_by usually has the agent ID
             let creatorId = String(t.admin_assignee_id); // Fallback string

             // Attempt to locate true creator if admin_assignee was overwritten
             if (t.created_by && t.created_by.type === 'admin') creatorId = String(t.created_by.id);
             
             // Track global agent escalations
             if (creatorId) {
                t2EscalationsByAgent[creatorId] = (t2EscalationsByAgent[creatorId] || 0) + 1;
                if (creatorId === String(myAdminId)) {
                    personalEscalationsToT3++;
                }
             }
        });
    }

    // ----- [TIER 2 SPECIFIC METRICS: 24h SLA BREACHES] -----
    let t2SlaBreachCount = 0;
    let myT2SlaBreachCount = 0;
    if (isT2) {
        // Tickets breaching 24h (86400 seconds)
        const slaTarget = 24 * 60 * 60;
        
        const countBreaches = (ticketArray: any[]) => {
            return ticketArray.filter(t => {
                if (!t.is_ticket) return false;
                const createdAt = t.created_at;
                const closedAt = t.statistics?.last_close_at || (t.state === 'resolved' ? t.updated_at : Date.now() / 1000);
                const duration = closedAt - createdAt;
                return duration > slaTarget;
            }).length;
        };

        t2SlaBreachCount = countBreaches(teamWeekConversations);
        myT2SlaBreachCount = countBreaches(myWeekConversations);
    }


    const myMonthCount = dbStats ? Number((dbStats as any).personal_month_solves || 0) : 0;
    const myWeekCount = dbStats ? Number((dbStats as any).personal_week_solves || 0) : myWeekConversations.length;

    // Leaderboard - Only count solves for the selected team
    const leaderboard: Record<string, any> = {};

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayTs = Math.floor(startOfToday.getTime() / 1000);

    // Use the already filtered teamConversations (which are filtered by team_assignee_id)
    [...teamConversations].forEach((conv: any) => {
        // Fallback to admin_assignee_id if last_closed_by_id is missing (common in some tiers)
        const closerId = conv.statistics?.last_closed_by_id || conv.admin_assignee_id;

        if (closerId) {
            const sCloserId = String(closerId);
            const adminInfo = adminMap.get(sCloserId);

            // For Leaderboard (and later Recent Solves), if a team is selected, 
            // ensure the closing agent actually belongs to that team!
            // (e.g. T1 agents frequently close T2 tickets)
            if (teamId && teamId !== 'all') {
                const targetTeamId = Number(teamId);
                const belongsToTeam = adminInfo?.team_ids?.includes(targetTeamId);
                if (!belongsToTeam) return; // Skip attributing to leaderboard
            }

            if (!leaderboard[sCloserId]) {
                leaderboard[sCloserId] = {
                    id: sCloserId,
                    name: adminInfo?.name || `Agent ${sCloserId}`,
                    avatar: adminInfo?.avatar || null,
                    count: 0,
                    dailyCount: 0
                };
            }
            leaderboard[sCloserId].count++;

            const closedAt = conv.statistics?.last_close_at || conv.updated_at;
            if (closedAt > startOfTodayTs) {
                leaderboard[sCloserId].dailyCount++;
            }
        }
    });

    // Generate Leaderboard
    const solvedCounts: Record<string, number> = {};
    Object.values(leaderboard).forEach((entry: any) => {
        solvedCounts[entry.id] = entry.count;
    });

    const rawLeaderboard = dbStats && (dbStats as any).leaderboard
        ? (dbStats as any).leaderboard as any[]
        // Fallback: Compute leaderboard manually
        : Object.entries(solvedCounts).map(([id, count]) => {
            const admin = adminMap.get(id);
            return {
                id,
                name: admin?.name || `Agent ${id}`,
                count: count as number,
                avatar: admin?.avatar || null
            };
        });

    let leaderboardArray = [...rawLeaderboard]
        .filter((entry: any) => entry.id !== '-1' && entry.name !== 'Unassigned')
        .sort((a: any, b: any) => b.count - a.count)
        .map((entry: any) => ({
             ...entry,
             escalatedCount: t2EscalationsByAgent[entry.id] || 0 // Inject T2 escalations into leaderboard
        }));


    // CSAT
    const processCSAT = (conversations: any[]) => {
        if (!conversations) return { percentage: 0, positiveRatings: 0, totalRatings: 0, pending: 0, remarks: [] };

        const ratedConvs = conversations.filter(c => c.conversation_rating?.rating != null);
        const pendingConvs = conversations.filter(c => c.conversation_rating?.rating == null);

        const total = ratedConvs.length;
        const positive = ratedConvs.filter(c => c.conversation_rating.rating >= 4).length;

        const remarks = ratedConvs
            .filter(c => c.conversation_rating.rating <= 3)
            .map(c => ({
                id: c.id,
                score: c.conversation_rating.rating,
                remark: c.conversation_rating.remark || 'No remark left.',
                created_at: c.conversation_rating.created_at,
                customer: 'Customer'
            }))
            .sort((a, b) => b.created_at - a.created_at);

        return {
            percentage: total ? Math.round((positive / total) * 100) : 0,
            positiveRatings: positive,
            totalRatings: total,
            pending: pendingConvs.length,
            remarks
        };
    };

    // Process CSAT with accurate team-assigned dataset
    const csatConversations = csatWeekObjRaw.conversations || [];
    const csatWeekConversations = csatConversations.filter((c: any) => c.conversation_rating?.requested_at > startOfWeekTs);

    // Calculate Hourly Breakdown
    const hourlyBreakdown = Array.from({ length: 24 }, (_, i) => ({
        hour: `${String(i).padStart(2, '0')}:00`,
        count: 0
    }));

    teamWeekConversations.forEach((conv: any) => {
        const closedAt = conv.statistics?.last_close_at || conv.updated_at;
        const date = new Date(closedAt * 1000);
        const hour = date.getHours();
        hourlyBreakdown[hour].count++;
    });

    // Product Segmentation Logic
    const PRODUCT_MAP: Record<string, string> = {
        'REVIEWS.io': 'Reviews.io',
        'Influence.io': 'Influence',
        'Influence': 'Influence',
        'Boost': 'Boost',
        'Rich Returns': 'Rich Returns',
        'RichReturns': 'Rich Returns',
        'ViralSweep': 'ViralSweep',
        'ConversionBear': 'ConversionBear',
        'Address Validator': 'Address Validator',
        'Clearer.io': 'Clearer',
        'Clearer': 'Clearer'
    };

    // Product tag IDs imported from product-config.ts (single source of truth)

    const extractProduct = (conv: any): string => {
        // 0. Highest priority: exact tag_id match (deterministic, never mismatches)
        if (conv.tags?.tags) {
            for (const tag of conv.tags.tags) {
                const mapped = TAG_ID_TO_PRODUCT[String(tag.id)];
                if (mapped) return mapped;
            }
        }

        // 1. Check Brand attribute (Case-insensitive & Partial matching)
        const brand = conv.custom_attributes?.Brand;
        if (brand) {
            const sBrand = String(brand).toLowerCase();
            if (sBrand.includes('reviews.io')) return 'Reviews.io';
            if (sBrand.includes('influence')) return 'Influence';
            if (sBrand.includes('boost')) return 'Boost';
            if (sBrand.includes('clearer')) return 'Clearer';
            if (sBrand.includes('viralsweep')) return 'ViralSweep';
            if (sBrand.includes('rich returns') || sBrand.includes('richreturns')) return 'Rich Returns';
            if (sBrand.includes('conversionbear') || sBrand.includes('conversion bear')) return 'ConversionBear';
            if (sBrand.includes('address validator')) return 'Address Validator';
        }

        // 2. Check Tags (Case-insensitive & Partial matching)
        if (conv.tags?.tags) {
            for (const tag of conv.tags.tags) {
                const tagName = tag.name.toLowerCase();
                if (tagName.includes('reviews.io')) return 'Reviews.io';
                if (tagName.includes('influence')) return 'Influence';
                if (tagName.includes('boost')) return 'Boost';
                if (tagName.includes('clearer')) return 'Clearer';
                if (tagName.includes('viralsweep')) return 'ViralSweep';
                if (tagName.includes('rich returns') || tagName.includes('richreturns')) return 'Rich Returns';
                if (tagName.includes('conversionbear')) return 'ConversionBear';
                if (tagName.includes('address validator')) return 'Address Validator';
            }
        }

        // 3. Check ticket_type (Intercom tickets use this instead of tags/brand)
        const ticketTypeName = typeof conv.ticket_type === 'string'
            ? conv.ticket_type
            : conv.ticket_type?.name;
        if (ticketTypeName) {
            const sType = String(ticketTypeName).toLowerCase();
            if (sType.includes('reviews.io') || sType.includes('reviews')) return 'Reviews.io';
            if (sType.includes('influence')) return 'Influence';
            if (sType.includes('boost')) return 'Boost';
            if (sType.includes('clearer')) return 'Clearer';
            if (sType.includes('viralsweep')) return 'ViralSweep';
            if (sType.includes('rich returns') || sType.includes('richreturns')) return 'Rich Returns';
            if (sType.includes('conversionbear') || sType.includes('conversion bear')) return 'ConversionBear';
            if (sType.includes('address validator')) return 'Address Validator';
            if (sType.includes('cancellation')) return 'Reviews.io'; // Cancellation tickets are Reviews.io
        }

        // 4. Check ticket_attributes (Store ID prefix like RI_ = Reviews.io)
        const ticketAttrs = conv.ticket_attributes;
        if (ticketAttrs) {
            const storeId = ticketAttrs['Store ID'] || '';
            if (storeId.startsWith('RI_')) return 'Reviews.io';
            if (storeId.startsWith('INF_')) return 'Influence';
            if (storeId.startsWith('BST_')) return 'Boost';
            if (storeId.startsWith('VS_')) return 'ViralSweep';
            if (storeId.startsWith('RR_')) return 'Rich Returns';

            // Check escalation title for product mentions
            const escalationTitle = String(ticketAttrs['Escalation Title'] || ticketAttrs['_default_title_'] || '').toLowerCase();
            if (escalationTitle) {
                if (escalationTitle.includes('reviews.io') || escalationTitle.includes('[ri]') || escalationTitle.includes('[ob]')) return 'Reviews.io';
                if (escalationTitle.includes('influence')) return 'Influence';
                if (escalationTitle.includes('boost')) return 'Boost';
                if (escalationTitle.includes('clearer')) return 'Clearer';
                if (escalationTitle.includes('viralsweep')) return 'ViralSweep';
                if (escalationTitle.includes('rich returns')) return 'Rich Returns';
                if (escalationTitle.includes('conversionbear') || escalationTitle.includes('conversion bear')) return 'ConversionBear';
                if (escalationTitle.includes('address validator')) return 'Address Validator';
            }
        }

        return 'Other';
    };


    const productStatsMap: Record<string, any> = {
        'Reviews.io': { name: 'Reviews.io', weekSolved: 0, monthSolved: 0, csatTotal: 0, csatCount: 0, pending: 0, trend: 0, leaderboards: {} },
        'Influence': { name: 'Influence', weekSolved: 0, monthSolved: 0, csatTotal: 0, csatCount: 0, pending: 0, trend: 0, leaderboards: {} },
        'Boost': { name: 'Boost', weekSolved: 0, monthSolved: 0, csatTotal: 0, csatCount: 0, pending: 0, trend: 0, leaderboards: {} },
        'Clearer': { name: 'Clearer', weekSolved: 0, monthSolved: 0, csatTotal: 0, csatCount: 0, pending: 0, trend: 0, leaderboards: {} },
        'ViralSweep': { name: 'ViralSweep', weekSolved: 0, monthSolved: 0, csatTotal: 0, csatCount: 0, pending: 0, trend: 0, leaderboards: {} },
        'Rich Returns': { name: 'Rich Returns', weekSolved: 0, monthSolved: 0, csatTotal: 0, csatCount: 0, pending: 0, trend: 0, leaderboards: {} },
        'ConversionBear': { name: 'ConversionBear', weekSolved: 0, monthSolved: 0, csatTotal: 0, csatCount: 0, pending: 0, trend: 0, leaderboards: {} },
        'Address Validator': { name: 'Address Validator', weekSolved: 0, monthSolved: 0, csatTotal: 0, csatCount: 0, pending: 0, trend: 0, leaderboards: {} },
        'Other': { name: 'Other', weekSolved: 0, monthSolved: 0, csatTotal: 0, csatCount: 0, pending: 0, trend: 0, leaderboards: {} }
    };


    teamConversations.forEach((conv: any) => {
        const product = extractProduct(conv);
        if (!productStatsMap[product]) {
            productStatsMap[product] = {
                name: product,
                weekSolved: 0,
                monthSolved: 0,
                csatTotal: 0,
                csatCount: 0,
                pending: 0,
                trend: 0,
                leaderboards: {} as Record<string, { id: string; name: string; avatar: string | null; count: number }>
            };

        }

        productStatsMap[product].monthSolved++;
        const closedAt = conv.statistics?.last_close_at || conv.updated_at;
        if (closedAt > startOfWeekTs) {
            productStatsMap[product].weekSolved++;
        }

        if (conv.conversation_rating?.rating) {
            productStatsMap[product].csatTotal += conv.conversation_rating.rating >= 4 ? 100 : 0;
            productStatsMap[product].csatCount++;
        }

        // Add to product-specific leaderboard
        const closerId = conv.statistics?.last_closed_by_id || conv.admin_assignee_id;
        if (closerId) {
            const sCloserId = String(closerId);
            if (!productStatsMap[product].leaderboards[sCloserId]) {
                const adminInfo = adminMap.get(sCloserId);
                productStatsMap[product].leaderboards[sCloserId] = {
                    id: sCloserId,
                    name: adminInfo?.name || `Agent ${sCloserId}`,
                    avatar: adminInfo?.avatar || null,
                    count: 0
                };
            }
            productStatsMap[product].leaderboards[sCloserId].count++;
        }
    });

    // Add active conversations to product counts
    (myActiveRaw.conversations || []).forEach((conv: any) => {
        const product = extractProduct(conv);
        if (productStatsMap[product]) {
            productStatsMap[product].pending++;
        }
    });

    // Process Previous Week Data for Trends
    const prevWeekRawConversations = prevWeekRaw.conversations || [];
    const prevWeekTeamConversations = filterByTeam(prevWeekRawConversations);

    // Product Trends
    const prevWeekStatsMap: Record<string, number> = {};
    prevWeekTeamConversations.forEach((conv: any) => {
        const product = extractProduct(conv);
        prevWeekStatsMap[product] = (prevWeekStatsMap[product] || 0) + 1;
    });

    const products: any[] = Object.values(productStatsMap).map((p: any) => {
        const prevCount = prevWeekStatsMap[p.name] || 0;
        // Avoid division by zero, set trend to 100% if prev is 0 but current is > 0
        const trend = prevCount === 0
            ? (p.weekSolved > 0 ? 100 : 0)
            : Math.round(((p.weekSolved - prevCount) / prevCount) * 100);

        return {
            name: p.name,
            weekSolved: p.weekSolved,
            monthSolved: p.monthSolved,
            csat: p.csatCount ? Math.round(p.csatTotal / p.csatCount) : null,
            csatState: p.csatCount ? 'rated' : 'pending',
            csatCount: p.csatCount,
            pending: p.pending,
            trend,
            leaderboard: Object.values(p.leaderboards)
                .sort((a: any, b: any) => b.count - a.count)
                .slice(0, 5)
        };
    }).sort((a, b) => b.weekSolved - a.weekSolved);




    // Calculate business hours between two timestamps (Mon-Fri, 08:00-18:00 UTC)
    const OFFICE_START = 8;  // 08:00 UTC
    const OFFICE_END = 18;   // 18:00 UTC
    const HOURS_PER_DAY = OFFICE_END - OFFICE_START; // 10 hours

    const calcBusinessSeconds = (startTs: number, endTs: number): number => {
        const startDate = new Date(startTs * 1000);
        const endDate = new Date(endTs * 1000);

        // For very short FRTs (< 2 hours), just return raw — likely same-day, same-shift
        const rawSeconds = endTs - startTs;
        if (rawSeconds <= 2 * 3600) return rawSeconds;

        let businessSeconds = 0;
        const cursor = new Date(startDate);

        // Walk through each day between start and end
        while (cursor < endDate) {
            const dayOfWeek = cursor.getUTCDay(); // 0=Sun, 6=Sat
            const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;

            if (isWeekday) {
                const dayStart = new Date(cursor);
                dayStart.setUTCHours(OFFICE_START, 0, 0, 0);
                const dayEnd = new Date(cursor);
                dayEnd.setUTCHours(OFFICE_END, 0, 0, 0);

                // Clamp to the actual start/end
                const effectiveStart = new Date(Math.max(cursor.getTime(), dayStart.getTime(), startDate.getTime()));
                const effectiveEnd = new Date(Math.min(dayEnd.getTime(), endDate.getTime()));

                if (effectiveStart < effectiveEnd) {
                    businessSeconds += (effectiveEnd.getTime() - effectiveStart.getTime()) / 1000;
                }
            }

            // Move to next day at midnight
            cursor.setUTCDate(cursor.getUTCDate() + 1);
            cursor.setUTCHours(0, 0, 0, 0);
        }

        // Floor: at minimum return 1 second to avoid 0s for valid replies
        return Math.max(businessSeconds, 1);
    };

    // Calculate First Response Time (FRT) — uses first_admin_reply_at, normalized to office hours
    const calculateFRT = (conversations: any[]) => {
        const frtValues: number[] = []; // stored in SECONDS (business hours only)

        conversations.forEach((conv: any) => {
            const firstReplyAt = conv.statistics?.first_admin_reply_at;
            const createdAt = conv.created_at;

            if (firstReplyAt && createdAt && firstReplyAt > createdAt) {
                const rawSeconds = firstReplyAt - createdAt;
                // Sanity check: between 1 second and 7 days
                if (rawSeconds > 0 && rawSeconds < 7 * 24 * 3600) {
                    const bizSeconds = calcBusinessSeconds(createdAt, firstReplyAt);
                    frtValues.push(bizSeconds);
                }
            }
        });

        if (frtValues.length === 0) return { average: 0, median: 0 };

        const sum = frtValues.reduce((a, b) => a + b, 0);
        const average = Math.round(sum / frtValues.length);

        const sorted = frtValues.sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] || 0;

        // Return in seconds (the UI already formats with formatTime)
        return { average, median };
    };

    // Use already fetched prev week data for generic trends
    const prevWeekCount = prevWeekTeamConversations.length;


    const weekTrend = prevWeekCount > 0 ? Math.round(((teamWeekCountTotal - prevWeekCount) / prevWeekCount) * 100) : 0;

    const frtToday = calculateFRT(teamConversations.filter((c: any) => {
        const closedAt = c.statistics?.last_close_at || c.updated_at;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return closedAt > Math.floor(today.getTime() / 1000);
    }));

    const frtWeek = calculateFRT(teamWeekConversations);
    const frtPrevWeek = calculateFRT(prevWeekTeamConversations);


    const frtTrend = frtPrevWeek.average > 0
        ? Math.round(((frtWeek.average - frtPrevWeek.average) / frtPrevWeek.average) * 100)
        : 0;

    const slaTarget = 15 * 60; // 15 minutes in seconds
    const underSLA = teamWeekConversations.filter((conv: any) => {
        const firstReplyAt = conv.statistics?.first_admin_reply_at; // ✅ Agent's first reply
        const createdAt = conv.created_at;
        if (firstReplyAt && createdAt) {
            const frtSeconds = firstReplyAt - createdAt;
            return frtSeconds <= slaTarget;
        }
        return false;
    }).length;

    const slaCompliance = teamWeekConversations.length > 0
        ? Math.round((underSLA / teamWeekConversations.length) * 100)
        : 0;

    const csatPrevWeekStartTs = startOfPrevWeekTs;

    let csatPrevWeekData = { conversations: [] };
    try {
        csatPrevWeekData = await makeIntercomRequest('/conversations/search', {
            query: buildCsatQuery(csatPrevWeekStartTs)
        });
    } catch (e) {
        console.warn('[Intercom] Failed to fetch previous CSAT data');
    }

    const csatPrevWeek = processCSAT(csatPrevWeekData.conversations || []);
    const csatTrend = csatPrevWeek.percentage > 0
        ? Math.round(processCSAT(csatWeekConversations).percentage - csatPrevWeek.percentage)
        : 0;

    const conversationStates = { open: 0, snoozed: 0, pending: 0 };
    (myActiveRaw.conversations || []).forEach((conv: any) => {
        if (conv.snoozed_until) conversationStates.snoozed++;
        else if (conv.waiting_since) conversationStates.pending++;
        else conversationStates.open++;
    });

    return {
        solved: {
            personal: {
                week: myWeekCount,
                month: myMonthCount,
                day: 0,
                weekTrend,
                monthTrend: 0,
                ...(isT2 && { escalatedCount: personalEscalationsToT3, breachCount: myT2SlaBreachCount })
            },
            team: {
                week: teamWeekCountTotal,
                month: teamMonthCountTotal,
                weekTrend,
                monthTrend: 0
            }
        },
        leaderboard: leaderboardArray.slice(0, 5),
        chatVolume: {
            closed_month: teamMonthCountTotal,
            total: teamWeekCountTotal,
            active: conversationStates.open + conversationStates.snoozed + conversationStates.pending,
            unassigned: Number(unassignedCount || 0),
            snoozed: conversationStates.snoozed,
            pending: conversationStates.pending,
            hourlyBreakdown: hourlyBreakdown.filter(h => h.count > 0),
            recentSolves: (() => {
                const seenRecentIds = new Set<string>();
                return teamWeekConversations
                    .filter((c: any) => {
                        // Deduplicate by ID
                        const id = String(c.id);
                        if (seenRecentIds.has(id)) return false;
                        seenIds.add(id);

                        const closedAt = c.statistics?.last_close_at || c.updated_at;
                        if (closedAt <= startOfWeekTs) return false;

                        // Ensure the resolving agent belongs to the team filter
                        const closerId = String(c.statistics?.last_closed_by_id || c.admin_assignee_id);
                        if (teamId && teamId !== 'all') {
                            const adminInfo = adminMap.get(closerId);
                            const belongsToTeam = adminInfo?.team_ids?.includes(Number(teamId));
                            if (!belongsToTeam) return false;
                        }
                        return true;
                    })
                    .sort((a: any, b: any) => (b.statistics?.last_close_at || b.updated_at) - (a.statistics?.last_close_at || a.updated_at))
                    .slice(0, 10)
                    .map((c: any) => {
                        const closerId = String(c.statistics?.last_closed_by_id || c.admin_assignee_id);
                        const agent = adminMap.get(closerId);
                        return {
                            id: c.id,
                            agent: agent?.name || 'Support Agent',
                            agentAvatar: agent?.avatar || null,
                            timestamp: (c.statistics?.last_close_at || c.updated_at) * 1000,
                            product: extractProduct(c)
                        };
                    });
            })(),
            ...(isT2 && { escalationsToT3: totalEscalationsToT3 })
        },

        frt: {
            today: frtToday,
            week: {
                average: frtWeek.average,
                median: frtWeek.median,
                trend: frtTrend
            },
            slaCompliance,
            ...(isT2 && { totalBreaches: t2SlaBreachCount })
        },
        csat: {
            // Week CSAT is perfectly accurate since we fetched all CSATs for the week
            week: processCSAT(csatWeekConversations),
            // Month CSAT is mathematically derived from Databricks since we don't fetch month objects
            month: dbStats ? {
                percentage: (dbStats as any).csat_month_avg ? Math.round((Number((dbStats as any).csat_month_avg) / 5) * 100) : 0,
                positiveRatings: 0, // Detail not needed for UI at month level
                totalRatings: Number((dbStats as any).csat_month_count || 0),
                pending: 0,
                remarks: []
            } : processCSAT(csatConversations),
            trend: dbStats && (dbStats as any).csat_prev_week_avg
                ? Math.round(((Number((dbStats as any).csat_week_avg || 0) / 5) * 100) - ((Number((dbStats as any).csat_prev_week_avg) / 5) * 100))
                : csatTrend
        },
        weeklyVolume: (() => {
            const results = (weeklyVolume as any[] || []).map((row: any) => {
                const wsDate = new Date(row.week_start);
                const label = wsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
                return {
                    weekLabel: label,
                    weekStartTs: Math.floor(wsDate.getTime() / 1000),
                    totalCount: Number(row.total_count || 0),
                    ratedCount: Number(row.rated_count || 0),
                    positiveCount: Number(row.positive_count || 0),
                    neutralCount: Number(row.neutral_count || 0),
                    negativeCount: Number(row.negative_count || 0)
                };
            });
            return results;
        })(),
        churnRiskAccounts: (() => {
            return (churnRiskAccounts as any[] || []).map((row: any) => ({
                id: String(row.id),
                customerEmail: String(row.customer_email || 'Unknown'),
                customerName: String(row.customer_name || 'Anonymous'),
                review: String(row.review || ''),
                churnDriver: String(row.churn_driver || 'Unknown'),
                updatedAt: Number(row.updated_at || 0)
            }));
        })(),
        commonIssues: (commonIssues as any[] || []).map((row: any) => ({
            issue_theme: String(row.issue_theme || 'other'),
            frequency: Number(row.frequency || 0),
            example_ticket: String(row.example_ticket || '')
        })),
        products,
        lastUpdated: new Date().toISOString()
    };
}


async function makeIntercomRequest(path: string, body: any = {}, method = 'POST') {
    const INTERCOM_TOKEN = process.env.VITE_INTERCOM_TOKEN;

    if (!INTERCOM_TOKEN) throw new Error('Missing VITE_INTERCOM_TOKEN');

    const response = await fetch(`https://api.intercom.io${path}`, {
        method,
        headers: {
            'Authorization': `Bearer ${INTERCOM_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Intercom-Version': '2.14',
        },
        body: method !== 'GET' ? JSON.stringify(body) : undefined,
        cache: 'no-store'
    });

    if (!response.ok) {
        if (response.status === 404) return { total_count: 0, conversations: [] };

        const errorText = await response.text();
        console.error(`Intercom API Error ${response.status}: ${errorText}`);
        throw new Error(`Intercom API Error: ${response.status}`);
    }

    return response.json();
}
