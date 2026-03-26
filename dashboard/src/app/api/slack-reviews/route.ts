import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { GoogleGenerativeAI } from '@google/generative-ai';

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
let cache: { data: any; fetchedAt: number } | null = null;

// In-memory cache for Slack user ID → display name lookups
const userNameCache = new Map<string, string>();

export interface ReviewData {
    rating: number;
    author: string;
    title: string;
    body: string;
    date_created: string;
    platform: string;
}

function countInRange(reviews: any[], fromTs: number, toTs: number): number {
    return reviews.filter((r: any) => {
        const ts = new Date(r.date_created).getTime();
        return ts >= fromTs && ts < toTs;
    }).length;
}

/**
 * Extracts all unique Slack user IDs from message texts (e.g. <@U08BD9HLNKB>)
 */
function extractUserIds(texts: string[]): string[] {
    const ids = new Set<string>();
    const pattern = /<@([A-Z0-9]+)>/g;
    for (const text of texts) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            ids.add(match[1]);
        }
    }
    return Array.from(ids);
}

/**
 * Resolves Slack user IDs to display names, using cache to avoid redundant API calls.
 * Falls back to the raw ID if lookup fails.
 */
async function resolveUserIds(slack: WebClient, userIds: string[]): Promise<Map<string, string>> {
    const toFetch = userIds.filter(id => !userNameCache.has(id));

    await Promise.all(toFetch.map(async (userId) => {
        try {
            const info = await slack.users.info({ user: userId });
            const user = info.user as any;
            // Prefer display_name → real_name → name, in that order
            const name =
                user?.profile?.display_name?.trim() ||
                user?.profile?.real_name?.trim() ||
                user?.name?.trim() ||
                userId;
            userNameCache.set(userId, name);
        } catch {
            // If lookup fails, keep the raw ID so the message still makes sense
            userNameCache.set(userId, userId);
        }
    }));

    return userNameCache;
}

/**
 * Replaces all <@USERID> occurrences in text with the resolved display name.
 */
function substituteUserIds(text: string, nameMap: Map<string, string>): string {
    return text.replace(/<@([A-Z0-9]+)>/g, (_, userId) => {
        return nameMap.get(userId) || userId;
    });
}

export async function GET() {
    const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
    const CHANNEL_ID = process.env.SLACK_REVIEWS_CHANNEL_ID;
    const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;

    // Not configured — return graceful empty state
    if (!SLACK_BOT_TOKEN || !CHANNEL_ID || !GEMINI_API_KEY) {
        return NextResponse.json({
            avgRating: 0, totalCount: 0, thisWeek: 0, lastWeek: 0,
            thisMonth: 0, lastMonth: 0, recent: [], configured: false
        });
    }

    // Serve from cache if fresh
    if (cache && (Date.now() - cache.fetchedAt) < CACHE_TTL) {
        return NextResponse.json(cache.data);
    }

    try {
        const slack = new WebClient(SLACK_BOT_TOKEN);
        const result = await slack.conversations.history({
            channel: CHANNEL_ID,
            limit: 100,
        });

        const messages = (result.messages || []).filter(m => m.text && !m.subtype);

        if (messages.length === 0) {
            const emptyData = {
                avgRating: 0, totalCount: 0, thisWeek: 0, lastWeek: 0,
                thisMonth: 0, lastMonth: 0, recent: [], configured: true
            };
            cache = { data: emptyData, fetchedAt: Date.now() };
            return NextResponse.json(emptyData);
        }

        // ── Step 1: Resolve all @mentions to real names ──────────────────────────
        const rawTexts = messages.map(m => m.text || '');
        const userIds = extractUserIds(rawTexts);
        console.log(`[Slack Reviews] Resolving ${userIds.length} unique user IDs to names...`);
        const nameMap = await resolveUserIds(slack, userIds);

        // ── Step 2: Pre-process messages — substitute IDs with real names ─────────
        const processedMessages = messages.map(m => {
            const cleanedText = substituteUserIds(m.text || '', nameMap);
            return `[TIMESTAMP: ${m.ts}]\n${cleanedText}`;
        });

        const rawBlock = processedMessages.join('\n\n---\n\n');

        // ── Step 3: Send pre-processed text to Gemini for review extraction ───────
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are a data parser. Extract customer reviews from the following Slack messages.
        These messages are from a Slack channel that receives notifications when customers leave reviews on G2, Shopify, Reviews.io, or similar platforms.
        
        Each Slack message typically follows a pattern like:
        "New 5* review on G2 for [Company]: [Reviewer Name] said [review text]"
        OR
        "New G2 review from [Name]: [review text]"
        
        Instructions:
        - Find ONLY notifications about customer reviews. Ignore unrelated team messages.
        - For each review, extract:
          - rating: number 1–5 (parse star symbols ⭐ or "5*" or "5 stars"; infer from tone if absent)
          - author: the name of the CUSTOMER who wrote the review (NOT the Slack bot or team member who posted the message)
          - title: a 1–5 word summary (generate one if not present)
          - body: the customer's actual review text (strip Slack formatting like *bold* or _italics_)
          - date_created: ISO 8601 datetime from the [TIMESTAMP: X.XXX] tag (Unix seconds)
          - platform: "G2", "Shopify", "Reviews.io", or "Unknown"
        
        Respond ONLY with a valid JSON array. No markdown code blocks, no explanation.
        Example:
        [{"rating":5,"author":"Jane Smith","title":"Game changer","body":"This tool saved us hours every week.","date_created":"2024-01-15T09:30:00Z","platform":"G2"}]
        
        Messages:
        ${rawBlock}
        `;

        const response = await model.generateContent(prompt);
        let responseText = response.response.text().trim();

        // Strip markdown if Gemini accidentally included it
        responseText = responseText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '');

        const parsedReviews: ReviewData[] = JSON.parse(responseText.trim());
        console.log(`[Slack Reviews] Gemini parsed ${parsedReviews.length} reviews from ${messages.length} messages.`);

        // ── Step 4: Compute time-range stats ─────────────────────────────────────
        const now = new Date();
        const dayOfWeek = now.getDay();
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfThisWeek.setHours(0, 0, 0, 0);

        const startOfLastWeek = new Date(startOfThisWeek);
        startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const totalCount = parsedReviews.length;
        const avgRating = totalCount > 0
            ? parsedReviews.reduce((sum, r) => sum + r.rating, 0) / totalCount
            : 0;

        const data = {
            avgRating,
            totalCount,
            thisWeek: countInRange(parsedReviews, startOfThisWeek.getTime(), Infinity),
            lastWeek: countInRange(parsedReviews, startOfLastWeek.getTime(), startOfThisWeek.getTime()),
            thisMonth: countInRange(parsedReviews, startOfThisMonth.getTime(), Infinity),
            lastMonth: countInRange(parsedReviews, startOfLastMonth.getTime(), endOfLastMonth.getTime()),
            recent: parsedReviews.slice(0, 3),
            configured: true,
        };

        cache = { data, fetchedAt: Date.now() };
        return NextResponse.json(data);

    } catch (err: any) {
        console.error('[Slack Reviews API]', err.message);
        if (cache) return NextResponse.json(cache.data);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
