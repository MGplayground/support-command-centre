import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { GoogleGenerativeAI } from '@google/generative-ai';

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
let cache: { data: any; fetchedAt: number } | null = null;

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

        const messages = result.messages || [];
        if (messages.length === 0) {
            const emptyData = {
                avgRating: 0, totalCount: 0, thisWeek: 0, lastWeek: 0,
                thisMonth: 0, lastMonth: 0, recent: [], configured: true
            };
            cache = { data: emptyData, fetchedAt: Date.now() };
            return NextResponse.json(emptyData);
        }

        // Format raw messages for Gemini to parse
        const rawTexts = messages
            .filter(m => m.text && !m.subtype) // Ignore system messages
            .map(m => `[TIMESTAMP: ${m.ts}]\n${m.text}`)
            .join('\n\n---\n\n');

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are a data parser. Extract customer reviews from the following raw Slack messages.
        Some messages may be conversations, ignore them if they are not reviews.
        For each review, extract:
        - rating: number between 1 and 5 (guess based on text if no stars are present, e.g. "Amazing!" = 5, "Terrible" = 1)
        - author: name of the reviewer (or "Anonymous" if not found)
        - title: a short summary of the review (max 5 words, generate one if missing)
        - body: the actual review text
        - date_created: the ISO string date derived from the [TIMESTAMP: 12345.678] tag (which is a Unix epoch in seconds)
        - platform: the platform (e.g. "G2", "Shopify", "Reviews.io" or "Unknown")

        Respond ONLY with a valid JSON array of objects, like this:
        [
          {
             "rating": 5,
             "author": "John Doe",
             "title": "Great product!",
             "body": "I love using this tool.",
             "date_created": "2023-10-01T12:00:00Z",
             "platform": "G2"
          }
        ]
        
        Do not include markdown codeblocks (like \`\`\`json). Just the raw JSON array.
        
        Raw messages:
        ${rawTexts}
        `;

        const response = await model.generateContent(prompt);
        let responseText = response.response.text().trim();
        
        // Strip markdown if Gemini accidentally included it
        if (responseText.startsWith('```json')) responseText = responseText.replace('```json', '');
        if (responseText.startsWith('```')) responseText = responseText.replace('```', '');
        if (responseText.endsWith('```')) responseText = responseText.slice(0, -3);

        const parsedReviews: ReviewData[] = JSON.parse(responseText.trim());

        // Time range boundaries
        const now = new Date();
        const startOfThisWeek = new Date(now);
        startOfThisWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)); // Mon
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
        // Return stale cache if we have it
        if (cache) return NextResponse.json(cache.data);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
