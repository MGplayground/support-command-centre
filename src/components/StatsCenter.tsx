import { useState, useEffect } from 'react';
import CSATGauge from './CSATGauge';
import { MessageCircle, Activity, X, AlertTriangle } from 'lucide-react';
import { getIntercomStats } from '../services/intercom';

export default function StatsCenter() {
    const [intercomStats, setIntercomStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    // Drill-down Review State
    const [selectedRemarks, setSelectedRemarks] = useState<any[] | null>(null);
    const [remarkTitle, setRemarkTitle] = useState('');

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const intercom = await getIntercomStats();
            console.log('[StatsCenter] Intercom Data Received:', intercom);
            setIntercomStats(intercom);
        } catch (error) {
            console.error('Error loading stats:', error);
            setError(error as Error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="liquid-tile h-32" />
                <div className="liquid-tile h-48" />
            </div>
        );
    }

    return (
        <div className="space-y-3 pb-8 relative">
            {/* Drill-down Modal */}
            {selectedRemarks && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)' }} onClick={() => setSelectedRemarks(null)}>
                    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md p-6 shadow-2xl transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-5 border-b border-white/5 pb-3">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <AlertTriangle className="text-red-400 w-5 h-5" />
                                {remarkTitle}
                            </h3>
                            <button onClick={() => setSelectedRemarks(null)} className="text-slate-400 hover:text-white transition-colors bg-white/5 p-1 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                            {selectedRemarks.map((r, i) => (
                                <div key={i} className="bg-slate-800/40 p-4 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="bg-red-500/10 text-red-400 font-bold text-xs px-2 py-1 rounded border border-red-500/20">
                                            {r.score}/5 Rating
                                        </span>
                                        <span className="text-slate-500 text-[10px]">
                                            {new Date(r.created_at * 1000).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-sm italic leading-relaxed">"{r.remark}"</p>
                                </div>
                            ))}
                            {selectedRemarks.length === 0 && (
                                <div className="text-slate-500 text-center italic py-8">No remarks found for low scores.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="liquid-tile p-4 border-red-500/50">
                    <div className="text-red-400 font-bold mb-2">⚠️ Failed to Load Data</div>
                    <div className="text-slate-300 text-sm">{error.message}</div>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-3 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-xs hover:bg-red-500/30"
                    >
                        Retry
                    </button>
                </div>
            )}

            {!error && (
                <>
                    {/* 1. Team Goals (Weekly & Monthly Grid) */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="section-label mb-0">
                                <MessageCircle className="w-3.5 h-3.5 text-cyan-400" />
                                TEAM PERFORMANCE GOALS
                            </h2>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-4">
                            {/* Weekly Goal */}
                            <div className="liquid-tile p-4 inner-glow animate-bloom" style={{ background: 'linear-gradient(135deg, hsla(var(--liquid-bg-raw), 0.6), hsla(199, 89%, 54%, 0.05))' }}>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Weekly Goal</div>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-2xl font-black text-white">{intercomStats?.solved?.team?.week || 0}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-1000 ease-out"
                                        style={{ width: `${Math.min(100, ((intercomStats?.solved?.team?.week || 0) / 500) * 100)}%` }}
                                    />
                                </div>
                                <div className="mt-1.5 text-[9px] font-bold text-cyan-400">
                                    {Math.min(100, Math.round(((intercomStats?.solved?.team?.week || 0) / 500) * 100))}% Complete
                                </div>
                            </div>

                            {/* Monthly Goal */}
                            <div className="liquid-tile p-4 inner-glow animate-bloom" style={{ background: 'linear-gradient(135deg, hsla(var(--liquid-bg-raw), 0.6), hsla(270, 95%, 75%, 0.05))', animationDelay: '0.1s' }}>
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Monthly Goal</div>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-2xl font-black text-white">{intercomStats?.solved?.team?.month || 0}</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-white/5">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-1000 ease-out"
                                        style={{ width: `${Math.min(100, ((intercomStats?.solved?.team?.month || 0) / 2000) * 100)}%` }}
                                    />
                                </div>
                                <div className="mt-1.5 text-[9px] font-bold text-purple-400">
                                    {Math.min(100, Math.round(((intercomStats?.solved?.team?.month || 0) / 2000) * 100))}% Complete
                                </div>
                            </div>
                        </div>

                        {/* Leaderboard */}
                        <div>
                            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 px-1">Top Solvers (Month)</h3>
                            <div className="space-y-1.5">
                                {intercomStats?.leaderboard?.map((agent: any, index: number) => (
                                    <div
                                        key={agent.id}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/20 border border-white/5 hover:bg-slate-800/40 hover:border-cyan-500/30 transition-all duration-300 group animate-bloom"
                                        style={{ animationDelay: `${index * 0.1}s` }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-bold ${index === 0 ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30 shadow-[0_0_10px_rgba(251,191,36,0.2)]' :
                                                index === 1 ? 'bg-slate-300/20 text-slate-200 border border-slate-300/30' :
                                                    index === 2 ? 'bg-orange-400/20 text-orange-300 border border-orange-400/30' :
                                                        'bg-slate-700/50 text-slate-500'
                                                }`}>
                                                {index + 1}
                                            </div>
                                            <div className="flex items-center gap-2.5">
                                                {agent.avatar ? (
                                                    <img src={agent.avatar} alt={agent.name} className="w-6 h-6 rounded-full ring-2 ring-white/5" />
                                                ) : (
                                                    <div className="w-6 h-6 rounded-full bg-cyan-900/40 flex items-center justify-center text-[10px] text-cyan-300 ring-2 ring-white/5 font-bold">
                                                        {agent.name.charAt(0)}
                                                    </div>
                                                )}
                                                <span className={`text-[13px] font-semibold ${index < 3 ? 'text-white' : 'text-slate-400'} group-hover:text-cyan-300 transition-colors`}>
                                                    {agent.name}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[13px] font-black text-white tabular-nums">{agent.count}</span>
                                            {index === 0 && <span className="text-[8px] font-bold text-amber-400 tracking-tighter uppercase">Leader</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {(!intercomStats?.leaderboard || intercomStats.leaderboard.length === 0) && (
                                <div className="text-center py-4 text-xs text-slate-600 italic">
                                    No solves recorded this month
                                </div>
                            )}
                        </div>
                    </section>

                    {/* 2. Your Performance (CSAT) */}
                    <section className="mt-6">
                        <h2 className="section-label">
                            <Activity className="w-3.5 h-3.5 text-cyan-400" />
                            YOUR PERFORMANCE (CSAT)
                        </h2>

                        <div className="liquid-tile p-6 inner-glow flex items-center justify-around gap-4 animate-bloom" style={{ animationDelay: '0.4s' }}>
                            <div className="relative group">
                                <CSATGauge
                                    percentage={intercomStats?.csat?.week?.percentage || 0}
                                    positiveRatings={intercomStats?.csat?.week?.positiveRatings || 0}
                                    totalRatings={intercomStats?.csat?.week?.totalRatings || 0}
                                    pending={intercomStats?.csat?.week?.pending || 0}
                                    timeframe="week"
                                    hasRemarks={(intercomStats?.csat?.week?.remarks?.length || 0) > 0}
                                    onClick={() => {
                                        if (intercomStats?.csat?.week?.remarks?.length) {
                                            setSelectedRemarks(intercomStats.csat.week.remarks);
                                            setRemarkTitle('Weekly Attention Items');
                                        }
                                    }}
                                />
                            </div>

                            <div className="w-[1px] h-24 bg-gradient-to-b from-transparent via-slate-700 to-transparent opacity-50" />

                            <div className="relative group">
                                <CSATGauge
                                    percentage={intercomStats?.csat?.month?.percentage || 0}
                                    positiveRatings={intercomStats?.csat?.month?.positiveRatings || 0}
                                    totalRatings={intercomStats?.csat?.month?.totalRatings || 0}
                                    pending={intercomStats?.csat?.month?.pending || 0}
                                    timeframe="month"
                                    hasRemarks={(intercomStats?.csat?.month?.remarks?.length || 0) > 0}
                                    onClick={() => {
                                        if (intercomStats?.csat?.month?.remarks?.length) {
                                            setSelectedRemarks(intercomStats.csat.month.remarks);
                                            setRemarkTitle('Monthly Attention Items');
                                        }
                                    }}
                                />
                            </div>
                        </div>
                        {((intercomStats?.csat?.week?.percentage < 75 && intercomStats?.csat?.week?.totalRatings > 0) ||
                            (intercomStats?.csat?.month?.percentage < 75 && intercomStats?.csat?.month?.totalRatings > 0)) && (
                                <div className="text-center mt-3 text-[10px] text-red-400 animate-pulse font-bold">
                                    ⚠️ Attention Required: Click gauges to review negative feedback
                                </div>
                            )}
                    </section>
                </>
            )}
        </div>
    );
}
