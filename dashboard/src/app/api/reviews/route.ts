import { NextResponse } from 'next/server';

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
let cache: { data: ReviewsData; fetchedAt: number } | null = null;

export interface ReviewData {
    rating: number;
    author: string;
    title: string;
    body: string;
    date_created: string;
}

export interface ReviewsData {
    avgRating: number;
    totalCount: number;
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
    recent: ReviewData[];
    configured: boolean;
}

function countInRange(reviews: any[], fromTs: number, toTs: number): number {
    return reviews.filter((r: any) => {
        const ts = new Date(r.date_created).getTime();
        return ts >= fromTs && ts < toTs;
    }).length;
}

export async function GET() {
    const API_KEY = process.env.REVIEWS_IO_API_KEY;
    const STORE_ID = process.env.REVIEWS_IO_STORE_ID;

    // Not configured — return graceful empty state
    if (!API_KEY || !STORE_ID) {
        return NextResponse.json({
            avgRating: 0, totalCount: 0, thisWeek: 0, lastWeek: 0,
            thisMonth: 0, lastMonth: 0, recent: [], configured: false
        } satisfies ReviewsData);
    }

    // Serve from cache if fresh
    if (cache && (Date.now() - cache.fetchedAt) < CACHE_TTL) {
        return NextResponse.json(cache.data);
    }

    try {
        const url = `https://api.reviews.io/merchant/reviews?apikey=${API_KEY}&store=${STORE_ID}&per_page=200&order_by=date_created&order=desc`;
        const res = await fetch(url, { next: { revalidate: 0 } });

        if (!res.ok) {
            throw new Error(`Reviews.io API error: ${res.status}`);
        }

        const json = await res.json();
        const reviews: any[] = json.reviews?.data ?? json.reviews ?? [];

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

        const statsRes = await fetch(
            `https://api.reviews.io/reviews/statistics?apikey=${API_KEY}&store=${STORE_ID}`,
            { next: { revalidate: 0 } }
        );

        let avgRating = 0;
        let totalCount = reviews.length;

        if (statsRes.ok) {
            const stats = await statsRes.json();
            avgRating = parseFloat(stats.stats?.average_rating ?? stats.average_rating ?? 0);
            totalCount = parseInt(stats.stats?.total_reviews ?? stats.total_reviews ?? reviews.length, 10);
        }

        const data: ReviewsData = {
            avgRating,
            totalCount,
            thisWeek: countInRange(reviews, startOfThisWeek.getTime(), Infinity),
            lastWeek: countInRange(reviews, startOfLastWeek.getTime(), startOfThisWeek.getTime()),
            thisMonth: countInRange(reviews, startOfThisMonth.getTime(), Infinity),
            lastMonth: countInRange(reviews, startOfLastMonth.getTime(), endOfLastMonth.getTime()),
            recent: reviews.slice(0, 3).map((r: any) => ({
                rating: parseFloat(r.rating ?? r.store_review_score ?? 0),
                author: r.reviewer?.first_name ?? r.name ?? 'Anonymous',
                title: r.title ?? '',
                body: r.review ?? r.body ?? '',
                date_created: r.date_created ?? '',
            })),
            configured: true,
        };

        cache = { data, fetchedAt: Date.now() };
        return NextResponse.json(data);

    } catch (err: any) {
        console.error('[Reviews API]', err.message);
        // Return stale cache if we have it
        if (cache) return NextResponse.json(cache.data);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
