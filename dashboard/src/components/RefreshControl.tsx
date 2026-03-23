'use client';

import { useState } from 'react';
import { RefreshCw, Play, Pause, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RefreshControlProps {
    isRefreshing: boolean;
    lastUpdated: string | null;
    onRefresh: () => void;
    refreshInterval: number; // milliseconds
    onIntervalChange: (interval: number) => void;
    isPaused: boolean;
    onPauseToggle: () => void;
}

const INTERVAL_OPTIONS = [
    { label: '30s', value: 30000 },
    { label: '1m', value: 60000 },
    { label: '2m', value: 120000 },
    { label: '5m', value: 300000 },
    { label: 'Off', value: 0 }
];

export default function RefreshControl({
    isRefreshing,
    lastUpdated,
    onRefresh,
    refreshInterval,
    onIntervalChange,
    isPaused,
    onPauseToggle
}: RefreshControlProps) {
    const [showIntervalMenu, setShowIntervalMenu] = useState(false);

    const currentIntervalLabel = INTERVAL_OPTIONS.find(opt => opt.value === refreshInterval)?.label || 'Custom';

    return (
        <div className="flex items-center space-x-3">
            {/* Last Updated */}
            {lastUpdated && (
                <div className="text-xs text-slate-400">
                    Updated {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true })}
                </div>
            )}

            {/* Manual Refresh Button */}
            <button
                onClick={onRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-violet-500/50 transition-colors disabled:opacity-50"
                title="Refresh now"
            >
                <RefreshCw
                    size={16}
                    className={isRefreshing ? 'animate-spin' : ''}
                />
            </button>

            {/* Pause/Play Toggle (only show if auto-refresh is enabled) */}
            {refreshInterval > 0 && (
                <button
                    onClick={onPauseToggle}
                    className={`p-2 rounded-lg border transition-colors ${isPaused
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-400 hover:bg-amber-500/20'
                            : 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                    title={isPaused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
                >
                    {isPaused ? <Play size={16} /> : <Pause size={16} />}
                </button>
            )}

            {/* Interval Selector */}
            <div className="relative">
                <button
                    onClick={() => setShowIntervalMenu(!showIntervalMenu)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-300 hover:text-white hover:border-violet-500/50 transition-colors"
                >
                    <Clock size={14} />
                    <span className="text-xs font-medium">{currentIntervalLabel}</span>
                </button>

                {showIntervalMenu && (
                    <>
                        {/* Backdrop to close menu */}
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setShowIntervalMenu(false)}
                        />

                        {/* Dropdown Menu */}
                        <div className="absolute right-0 mt-2 w-32 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-20 overflow-hidden">
                            <div className="py-1">
                                <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                    Refresh Every
                                </div>
                                {INTERVAL_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => {
                                            onIntervalChange(option.value);
                                            setShowIntervalMenu(false);
                                        }}
                                        className={`w-full px-3 py-2 text-sm text-left transition-colors ${refreshInterval === option.value
                                                ? 'bg-violet-600 text-white'
                                                : 'text-slate-300 hover:bg-slate-700/50'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Status Indicator */}
            {refreshInterval > 0 && !isPaused && (
                <div className="flex items-center space-x-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs text-emerald-400">Live</span>
                </div>
            )}
        </div>
    );
}
