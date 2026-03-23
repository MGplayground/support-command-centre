'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, Calendar, TrendingUp } from 'lucide-react';
import {
    ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

interface WeeklyDrilldownProps {
    weekStartTs: number;
    onClose: () => void;
}

export default function WeeklyDrilldownModal({ weekStartTs, onClose }: WeeklyDrilldownProps) {
    const [dailyData, setDailyData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [weekName, setWeekName] = useState('');
    const [totalThisWeek, setTotalThisWeek] = useState(0);

    useEffect(() => {
        const d = new Date(weekStartTs * 1000);
        setWeekName(`Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`);

        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);
                const query = new URLSearchParams(window.location.search);
                const teamId = query.get('teamId') || 'all';

                const res = await fetch(
                    `/api/intercom/weekly-drilldown?weekStartTs=${weekStartTs}&teamId=${teamId}`
                );

                if (!res.ok) throw new Error(`Request failed: ${res.status}`);

                const data = await res.json();

                // API returns the matrix directly: { daily: [{ dayName, dateStr, currentWeek, prevWeek1, prevWeek2, prevWeek3 }] }
                const rows = data.daily || [];
                setDailyData(rows);
                setTotalThisWeek(rows.reduce((sum: number, r: any) => sum + (r.currentWeek || 0), 0));
            } catch (e: any) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [weekStartTs]);

    const DailyTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload.length) return null;
        // `payload[0].payload` is the raw row from `dailyData`
        const row = payload[0].payload;
        return (
            <div className="bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl p-3 backdrop-blur-md min-w-[180px]">
                <p className="text-xs font-semibold text-slate-300 mb-2 border-b border-slate-800 pb-1.5">{row.dateStr || label}</p>
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center gap-4">
                        <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
                            This Week
                        </span>
                        <span className="text-xs font-bold text-white">{(row.currentWeek || 0).toLocaleString()}</span>
                    </div>
                    {row.prevWeek1 > 0 && (
                        <div className="flex justify-between items-center gap-4">
                            <span className="flex items-center gap-1.5 text-xs text-indigo-400">
                                <span className="w-3 h-0.5 bg-indigo-400 inline-block" />
                                1 Wk Ago
                            </span>
                            <span className="text-xs text-slate-300">{row.prevWeek1.toLocaleString()}</span>
                        </div>
                    )}
                    {row.prevWeek2 > 0 && (
                        <div className="flex justify-between items-center gap-4">
                            <span className="flex items-center gap-1.5 text-xs text-violet-400">
                                <span className="w-3 h-0.5 bg-violet-400 inline-block" />
                                2 Wks Ago
                            </span>
                            <span className="text-xs text-slate-300">{row.prevWeek2.toLocaleString()}</span>
                        </div>
                    )}
                    {row.prevWeek3 > 0 && (
                        <div className="flex justify-between items-center gap-4">
                            <span className="flex items-center gap-1.5 text-xs text-fuchsia-400">
                                <span className="w-3 h-0.5 bg-fuchsia-400 inline-block" />
                                3 Wks Ago
                            </span>
                            <span className="text-xs text-slate-300">{row.prevWeek3.toLocaleString()}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        // Backdrop – click outside to close
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 lg:p-12"
            onClick={onClose}
        >
            {/* Modal – constrained width so it doesn't go full-screen */}
            <div
                className="bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden ring-1 ring-white/5"
                style={{ maxHeight: '80vh' }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg border border-cyan-500/20">
                            <Calendar size={18} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white leading-tight">{weekName}</h3>
                            <p className="text-xs text-slate-500">Daily conversation volume</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Quick stat badge */}
                        {!isLoading && totalThisWeek > 0 && (
                            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                                <TrendingUp size={13} className="text-cyan-400" />
                                <span className="text-sm font-bold text-cyan-300">{totalThisWeek.toLocaleString()}</span>
                                <span className="text-xs text-slate-500">total</span>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin mb-3 text-cyan-500" />
                            <p className="text-sm">Loading daily data...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-64 text-rose-400">
                            <p className="font-medium mb-1">Failed to load</p>
                            <p className="text-xs opacity-70">{error}</p>
                        </div>
                    ) : dailyData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <p className="text-sm">No data for this week</p>
                        </div>
                    ) : (
                        <>
                            {/* Legend */}
                            <div className="flex flex-wrap gap-3 mb-4">
                                <span className="flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
                                    <span className="w-3 h-0.5 bg-cyan-400 rounded inline-block" style={{ height: 3 }} />
                                    This Week
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-indigo-400">
                                    <span className="w-3 inline-block border-t border-dashed border-indigo-400" />
                                    1 Wk Ago
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-violet-400">
                                    <span className="w-3 inline-block border-t border-dashed border-violet-400" />
                                    2 Wks Ago
                                </span>
                                <span className="flex items-center gap-1.5 text-xs text-fuchsia-400">
                                    <span className="w-3 inline-block border-t border-dashed border-fuchsia-400" />
                                    3 Wks Ago
                                </span>
                            </div>

                            {/* Chart */}
                            <div className="h-72 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={dailyData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="gCurrent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                        <XAxis
                                            dataKey="dayName"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                                            dy={8}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 10 }}
                                            width={40}
                                        />
                                        <Tooltip content={<DailyTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.05)', strokeWidth: 30 }} />

                                        {/* Prev week lines (drawn first, behind) */}
                                        <Line type="monotone" dataKey="prevWeek3" stroke="#a855f7" strokeWidth={1} strokeDasharray="4 3" dot={false} opacity={0.35} isAnimationActive={false} />
                                        <Line type="monotone" dataKey="prevWeek2" stroke="#8b5cf6" strokeWidth={1} strokeDasharray="4 3" dot={false} opacity={0.5} isAnimationActive={false} />
                                        <Line type="monotone" dataKey="prevWeek1" stroke="#6366f1" strokeWidth={1.5} strokeDasharray="4 3" dot={false} opacity={0.7} isAnimationActive={false} />

                                        {/* Current week – area + bold line on top */}
                                        <Area
                                            type="monotone"
                                            dataKey="currentWeek"
                                            stroke="#22d3ee"
                                            strokeWidth={3}
                                            fill="url(#gCurrent)"
                                            activeDot={{ r: 5, fill: '#fff', stroke: '#06b6d4', strokeWidth: 2 }}
                                            isAnimationActive={false}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
