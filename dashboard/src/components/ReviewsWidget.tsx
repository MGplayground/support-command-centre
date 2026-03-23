'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Star, ArrowUpRight, ArrowDownRight, Minus, ExternalLink, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';

const fetcher = (url: string) => fetch(url).then(r => r.json());

function StarRating({ rating, max = 5 }: { rating: number; max?: number }) {
    return (
        <div className="flex items-center gap-0.5">
            {Array.from({ length: max }).map((_, i) => (
                <Star
                    key={i}
                    size={14}
                    className={i < Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
                />
            ))}
        </div>
    );
}

function TrendBadge({ current, previous }: { current: number; previous: number }) {
    if (previous === 0 && current === 0) return <span className="text-slate-500 text-xs">—</span>;
    const diff = current - previous;
    if (diff > 0) return (
        <span className="flex items-center gap-0.5 text-emerald-400 text-xs font-semibold">
            <ArrowUpRight size={12} />+{diff} vs last week
        </span>
    );
    if (diff < 0) return (
        <span className="flex items-center gap-0.5 text-rose-400 text-xs font-semibold">
            <ArrowDownRight size={12} />{diff} vs last week
        </span>
    );
    return <span className="flex items-center gap-0.5 text-slate-400 text-xs"><Minus size={12} />Same as last week</span>;
}

function MonthTrendBadge({ current, previous }: { current: number; previous: number }) {
    if (previous === 0 && current === 0) return null;
    const diff = current - previous;
    const pct = previous > 0 ? Math.round((diff / previous) * 100) : 0;
    const label = diff > 0 ? `↑ ${pct}% vs last month` : diff < 0 ? `↓ ${Math.abs(pct)}% vs last month` : 'Same as last month';
    const color = diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-rose-400' : 'text-slate-400';
    return <span className={clsx('text-xs', color)}>{label}</span>;
}

export default function ReviewsWidget() {
    const { data, isLoading } = useSWR('/api/slack-reviews', fetcher, { refreshInterval: 15 * 60 * 1000 });

    if (isLoading) {
        return (
            <div className="glass-panel p-6 flex flex-col items-center justify-center text-slate-500 min-h-[200px]">
                <Star size={32} className="text-slate-600/50 mb-3 animate-pulse" />
                <p className="text-sm">Loading reviews...</p>
            </div>
        );
    }

    if (!data?.configured) {
        return (
            <div className="glass-panel p-6 flex flex-col items-center justify-center text-slate-500 min-h-[200px] text-center gap-2">
                <Settings size={32} className="text-slate-600/50 mb-1" />
                <p className="text-sm font-semibold text-slate-400">Slack not configured</p>
                <p className="text-xs text-slate-600">Add <code className="text-violet-400">SLACK_BOT_TOKEN</code> and <code className="text-violet-400">SLACK_REVIEWS_CHANNEL_ID</code> to your <code className="text-slate-400">.env.local</code> to enable this widget.</p>
            </div>
        );
    }

    const { avgRating, totalCount, thisWeek, lastWeek, thisMonth, lastMonth, recent } = data;

    return (
        <div className="glass-panel p-6 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Star size={16} className="text-amber-400 fill-amber-400" />
                    Company Reviews
                </h3>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                    Live from Slack
                </span>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3">
                {/* Avg Rating */}
                <div className="bg-slate-800/50 rounded-xl p-3 flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold text-white">{avgRating.toFixed(1)}</span>
                    <StarRating rating={avgRating} />
                    <span className="text-xs text-slate-500">Avg Rating</span>
                </div>

                {/* This Week */}
                <div className="bg-slate-800/50 rounded-xl p-3 flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold text-white">{thisWeek}</span>
                    <TrendBadge current={thisWeek} previous={lastWeek} />
                    <span className="text-xs text-slate-500">This Week</span>
                </div>

                {/* This Month */}
                <div className="bg-slate-800/50 rounded-xl p-3 flex flex-col items-center gap-1">
                    <span className="text-2xl font-bold text-white">{thisMonth}</span>
                    <MonthTrendBadge current={thisMonth} previous={lastMonth} />
                    <span className="text-xs text-slate-500">This Month</span>
                </div>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-700/50 pt-3">
                <span>{totalCount.toLocaleString()} total reviews evaluated</span>
            </div>

            {/* Recent Reviews */}
            {recent && recent.length > 0 && (
                <div className="space-y-2">
                    {recent.map((r: any, i: number) => (
                        <div key={i} className="bg-slate-800/30 rounded-lg p-3 space-y-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-slate-300">{r.author}</span>
                                    {r.platform && r.platform !== "Unknown" && (
                                        <span className="text-[10px] uppercase font-bold text-violet-400 bg-violet-900/30 px-1.5 py-0.5 rounded">
                                            {r.platform}
                                        </span>
                                    )}
                                    <StarRating rating={r.rating} />
                                </div>
                                {r.date_created && (
                                    <span className="text-xs text-slate-600">
                                        {formatDistanceToNow(new Date(r.date_created), { addSuffix: true })}
                                    </span>
                                )}
                            </div>
                            {r.title && <p className="text-xs font-medium text-white">{r.title}</p>}
                            {r.body && (
                                <p className="text-xs text-slate-400 line-clamp-2">{r.body}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
