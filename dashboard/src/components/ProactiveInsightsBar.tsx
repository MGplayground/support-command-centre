'use client';

import React, { useState } from 'react';
import { Insight, InsightSeverity } from '@/lib/insights-engine';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { clsx } from 'clsx';

interface ProactiveInsightsBarProps {
    insights: Insight[];
}

const severityStyles: Record<InsightSeverity, string> = {
    critical: 'border-rose-500/60 bg-rose-500/10 text-rose-200',
    warning:  'border-amber-500/60 bg-amber-500/10 text-amber-200',
    info:     'border-violet-500/60 bg-violet-500/10 text-violet-200',
    success:  'border-emerald-500/40 bg-emerald-500/5 text-emerald-300',
};

const pulseSeverities: InsightSeverity[] = ['critical'];

export default function ProactiveInsightsBar({ insights }: ProactiveInsightsBarProps) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const [isCollapsed, setIsCollapsed] = useState(false);

    const visible = insights.filter(i => !dismissed.has(i.id));

    if (visible.length === 0) return null;

    return (
        <div className="w-full space-y-2">
            {/* Header row */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                    🧠 Live Insights
                </span>
                <button
                    onClick={() => setIsCollapsed(prev => !prev)}
                    className="text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 text-xs"
                >
                    {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                    {isCollapsed ? 'Show' : 'Hide'}
                </button>
            </div>

            {/* Cards */}
            {!isCollapsed && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {visible.map(insight => (
                        <div
                            key={insight.id}
                            className={clsx(
                                'relative border rounded-xl px-4 py-3 flex items-start gap-3 transition-all',
                                severityStyles[insight.severity]
                            )}
                        >
                            {/* Pulse ring for critical alerts */}
                            {pulseSeverities.includes(insight.severity) && (
                                <span className="absolute -top-1 -left-1 h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-50" />
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                                </span>
                            )}

                            {/* Icon */}
                            <span className="text-xl leading-none mt-0.5 flex-shrink-0" role="img">
                                {insight.icon}
                            </span>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm leading-tight">{insight.title}</p>
                                <p className="text-xs opacity-80 mt-0.5 leading-snug">{insight.message}</p>
                            </div>

                            {/* Dismiss button (don't show for all-clear) */}
                            {insight.id !== 'all-clear' && (
                                <button
                                    onClick={() => setDismissed(prev => new Set([...prev, insight.id]))}
                                    className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5"
                                    aria-label="Dismiss insight"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
