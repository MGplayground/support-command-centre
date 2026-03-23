'use client';

import { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { IntercomStats } from '@/lib/intercom-types';
import WeeklyDrilldownModal from './WeeklyDrilldownModal';
import { Smile, Meh, Frown } from 'lucide-react';

interface VolumeChartProps {
    stats: IntercomStats | null;
}

export default function VolumeChart({ stats }: VolumeChartProps) {
    const [drilldownWeekStartTs, setDrilldownWeekStartTs] = useState<number | null>(null);

    const weeklyData = stats?.weeklyVolume;

    // Handle single or double click depending on user interaction preference (we'll use onClick on the bar)
    const handleBarClick = (data: any) => {
        if (!data || !data.activePayload || !data.activePayload[0]) return;
        const payload = data.activePayload[0].payload;
        if (payload.weekStartTs) {
            setDrilldownWeekStartTs(payload.weekStartTs);
        }
    };

    if (!weeklyData || weeklyData.length === 0) {
        return (
            <div className="h-[200px] w-full flex items-center justify-center text-slate-500">
                <p className="text-sm">No weekly data available</p>
            </div>
        );
    }

    // Custom tooltip showing Databricks AI sentiment
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || !payload[0]) return null;

        const data = payload[0].payload;
        const rated = data.ratedCount || 0;
        const coveragePct = data.totalCount > 0 ? Math.round((rated / data.totalCount) * 100) : 0;

        return (
            <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-4 shadow-xl min-w-[220px]">
                <p className="text-sm font-medium text-slate-300 mb-3 border-b border-slate-700/50 pb-2">{label}</p>

                <div className="space-y-3 font-medium">
                    <div className="flex items-center justify-between text-base">
                        <span className="text-slate-200">Total Volume</span>
                        <span className="font-bold text-white">{data.totalCount.toLocaleString()}</span>
                    </div>

                    {rated > 0 && (
                        <>
                            <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-700/40 pt-2">
                                <span>AI Rated Reviews</span>
                                <span className="text-violet-400">{rated.toLocaleString()} <span className="text-slate-500">({coveragePct}%)</span></span>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center text-emerald-400">
                                        <Smile size={14} className="mr-1.5" /> Positive
                                    </span>
                                    <span className="text-slate-300">{data.positiveCount.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center text-slate-400">
                                        <Meh size={14} className="mr-1.5" /> Neutral
                                    </span>
                                    <span className="text-slate-300">{data.neutralCount.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center text-rose-400">
                                        <Frown size={14} className="mr-1.5" /> Negative
                                    </span>
                                    <span className="text-slate-300">{data.negativeCount.toLocaleString()}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div
                    className="mt-4 text-[10px] text-violet-400 uppercase tracking-widest text-center bg-violet-500/20 rounded py-1.5 border border-violet-500/30 cursor-pointer hover:bg-violet-500/30 hover:text-white transition-colors"
                    onClick={() => {
                        if (data.weekStartTs) setDrilldownWeekStartTs(data.weekStartTs);
                    }}
                >
                    Click for Daily Breakdown
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Chart */}
            <div className="h-[250px] w-full cursor-pointer relative group">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData} onClick={handleBarClick} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis
                            dataKey="weekLabel"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 11 }}
                            dx={10}
                        />
                        <Tooltip
                            content={<CustomTooltip />}
                            cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                            wrapperStyle={{ pointerEvents: 'auto' }}
                        />
                        <Bar
                            dataKey="totalCount"
                            radius={[4, 4, 0, 0]}
                            barSize={32}
                            fillOpacity={0.9}
                            isAnimationActive={false} // Prevents click-interception issues during transition
                            onClick={(dataOuter: any) => {
                                const payload = dataOuter?.payload || dataOuter;
                                if (payload && payload.weekStartTs) {
                                    setDrilldownWeekStartTs(payload.weekStartTs);
                                }
                            }}
                        >
                            {
                                weeklyData.map((entry, index) => {
                                    // Highlight the most recent/current week
                                    const isCurrent = index === weeklyData.length - 1;
                                    return (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={isCurrent ? '#8b5cf6' : '#6366f1'}
                                            opacity={isCurrent ? 1 : 0.6}
                                        />
                                    );
                                })
                            }
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Drilldown Modal (Liquid Glass) */}
            {drilldownWeekStartTs && (
                <WeeklyDrilldownModal
                    weekStartTs={drilldownWeekStartTs}
                    onClose={() => setDrilldownWeekStartTs(null)}
                />
            )}
        </>
    );
}
