'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { TIER_CONFIGS } from '@/lib/tier-config';

const TIER_KEYS = ['ALL', 'T1', 'T2', 'T3'] as const;

function InsightsContent() {
    const searchParams = useSearchParams();

    // Priority: URL param > localStorage > 'ALL'
    const getInitialTier = () => {
        const fromUrl = searchParams.get('tier');
        if (fromUrl && TIER_KEYS.includes(fromUrl as any)) return fromUrl;
        if (typeof window !== 'undefined') {
            try {
                const stored = localStorage.getItem('dashboard:tier');
                if (stored) return JSON.parse(stored);
            } catch { }
        }
        return 'ALL';
    };

    const [isLoading, setIsLoading] = useState(true);
    const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');
    const [tier, setTier] = useState(getInitialTier);

    // Build insights URL with both timeframe and team/tier parameters
    const tierConfig = TIER_CONFIGS[tier as keyof typeof TIER_CONFIGS];
    const teamParam = tierConfig?.teamId ? `&team=${tierConfig.teamId}` : '';
    const insightsUrl = `https://insights.clearer.io/?timeframe=${timeframe}${teamParam}&tier=${tier}`;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            Historical Insights
                            <span className="text-violet-500">.</span>
                        </h1>
                        <p className="text-slate-400 mt-1">
                            Long-term trends and forecasting powered by clearer.io analytics
                        </p>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Tier Selector */}
                        <div className="inline-flex items-center space-x-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                            {TIER_KEYS.map(t => (
                                <button
                                    key={t}
                                    onClick={() => { setTier(t); setIsLoading(true); }}
                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${tier === t
                                        ? 'bg-violet-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>

                        {/* Timeframe Toggle */}
                        <div className="inline-flex items-center space-x-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                            <button
                                onClick={() => { setTimeframe('week'); setIsLoading(true); }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${timeframe === 'week'
                                    ? 'bg-violet-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                            >
                                Week
                            </button>
                            <button
                                onClick={() => { setTimeframe('month'); setIsLoading(true); }}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${timeframe === 'month'
                                    ? 'bg-violet-600 text-white shadow-lg'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                    }`}
                            >
                                Month
                            </button>
                        </div>

                        <a
                            href={insightsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50 text-slate-300 hover:text-white hover:border-violet-500/50 transition-colors"
                        >
                            <ExternalLink size={16} />
                            <span className="text-sm font-medium">Open in New Tab</span>
                        </a>
                    </div>
                </div>

                {/* Info Banner */}
                <div className="glass-panel p-4 border-l-4 border-amber-500">
                    <div className="flex items-start space-x-3">
                        <AlertCircle className="text-amber-400 mt-0.5" size={20} />
                        <div>
                            <p className="text-sm text-slate-300">
                                <strong>Authentication Required:</strong> Due to browser security restrictions, you cannot sign in through the embedded iframe.
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                                Please use the <strong>&quot;Open in New Tab&quot;</strong> button above to sign in and view your Historical Insights dashboard.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Iframe Container */}
                <div className="glass-panel p-1 relative" style={{ height: 'calc(100vh - 320px)' }}>
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10 rounded-xl">
                            <div className="flex flex-col items-center space-y-3">
                                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                                <span className="text-slate-400 text-sm">Loading Historical Insights...</span>
                            </div>
                        </div>
                    )}

                    <iframe
                        src={insightsUrl}
                        className="w-full h-full rounded-lg bg-white"
                        title="Historical Insights Dashboard"
                        onLoad={() => setIsLoading(false)}
                    />
                </div>
            </div>
        </div>
    );
}

export default function InsightsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            </div>
        }>
            <InsightsContent />
        </Suspense>
    );
}
