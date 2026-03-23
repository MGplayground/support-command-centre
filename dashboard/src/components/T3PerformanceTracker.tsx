'use client';

import useSWR from 'swr';
import { TrendingUp, TrendingDown, Bug, Clock, AlertTriangle } from 'lucide-react';
import TrendBadge from './TrendBadge';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function T3PerformanceTracker() {
    const { data, error, isLoading } = useSWR('/api/intercom/tickets', fetcher, {
        refreshInterval: 120000, // Poll every 2 minutes (tickets update less frequently)
    });

    if (isLoading || !data) {
        return (
            <div className="glass-panel p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Bug className="mr-2 text-cyan-400" size={20} />
                    Tier 3 Performance (Development)
                </h3>
                <div className="flex items-center justify-center h-24 text-slate-500">
                    <div className="animate-pulse">Loading T3 metrics...</div>
                </div>
            </div>
        );
    }

    if (error || data.error) {
        return (
            <div className="glass-panel p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Bug className="mr-2 text-cyan-400" size={20} />
                    Tier 3 Performance (Development)
                </h3>
                <div className="flex items-center justify-center h-24 text-amber-400">
                    <AlertTriangle className="mr-2" size={16} />
                    <span className="text-sm">Tickets API unavailable</span>
                </div>
            </div>
        );
    }

    return (
        <div className="glass-panel p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center">
                <Bug className="mr-2 text-cyan-400" size={20} />
                Tier 3 Performance (Development)
            </h3>

            <div className="grid grid-cols-3 gap-6">
                {/* Total Escalated */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm font-medium uppercase tracking-wider">
                            Total Escalated
                        </span>
                        {data.trend !== 0 && (
                            <TrendBadge value={data.trend} inverse />
                        )}
                    </div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-4xl font-bold text-white">{data.totalEscalated}</span>
                        <span className="text-sm text-slate-500">this week</span>
                    </div>
                </div>

                {/* Avg Dev Response Time */}
                <div className="space-y-2">
                    <span className="text-slate-400 text-sm font-medium uppercase tracking-wider block">
                        Avg Dev Response
                    </span>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-4xl font-bold text-white">{data.avgDevResponseTime}</span>
                        <span className="text-sm text-slate-500">hours</span>
                    </div>
                    <div className="flex items-center space-x-1 text-xs text-cyan-400">
                        <Clock size={12} />
                        <span>First response time</span>
                    </div>
                </div>

                {/* Pending Fixes */}
                <div className="space-y-2">
                    <span className="text-slate-400 text-sm font-medium uppercase tracking-wider block">
                        Pending Fixes
                    </span>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-4xl font-bold text-white">{data.pendingFixes}</span>
                        <span className="text-sm text-slate-500">open</span>
                    </div>
                    <div className={`text-xs ${data.pendingFixes > 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {data.pendingFixes > 10 ? '⚠ Above threshold' : '✓ Within SLA'}
                    </div>
                </div>
            </div>
        </div>
    );
}
