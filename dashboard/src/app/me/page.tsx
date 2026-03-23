"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
    Loader2, Activity, Bell, MessageSquare, Target, Zap, TrendingUp,
    Edit3, Check, X, Plus, Minus, Palette, ArrowUpRight, AlertTriangle
} from "lucide-react";
import TrendBadge from "@/components/TrendBadge";
import QueueModal, { QueueFilter } from "@/components/QueueModal";
import { usePersonalGoals, CustomGoal } from "@/hooks/usePersonalGoals";
import { useAvatar, AVATAR_OPTIONS } from "@/hooks/useAvatar";

// ─── Goal helpers ─────────────────────────────────────────────────────
function GoalBar({ pct, color = 'bg-violet-500' }: { pct: number; color?: string }) {
    return (
        <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5">
            <div className={`h-full rounded-full transition-all duration-700 ${pct >= 100 ? 'bg-emerald-500' : color}`}
                style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
    );
}

function CustomGoalWidget({ goal, onUpdate }: { goal: CustomGoal; onUpdate: (p: Partial<CustomGoal>) => void }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState({ ...goal });
    const pct = goal.target > 0 ? (goal.current / goal.target) * 100 : 0;

    if (editing) return (
        <div className="glass-panel p-5 space-y-3 flex-shrink-0">
            <input className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500"
                placeholder="Goal title" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Target</label>
                    <input type="number" min={1} value={draft.target} onChange={e => setDraft(p => ({ ...p, target: Number(e.target.value) }))}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
                <div>
                    <label className="text-xs text-slate-500 uppercase tracking-wider block mb-1">Unit</label>
                    <input type="text" value={draft.unit} placeholder="articles…" onChange={e => setDraft(p => ({ ...p, unit: e.target.value }))}
                        className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none" />
                </div>
            </div>
            <div className="flex gap-2">
                <button onClick={() => { onUpdate(draft); setEditing(false); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-medium transition-colors">
                    <Check size={13} /> Save
                </button>
                <button onClick={() => setEditing(false)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors">
                    <X size={13} /> Cancel
                </button>
            </div>
        </div>
    );

    return (
        <div className="glass-panel p-5 flex-shrink-0">
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{goal.title}</p>
                    <p className="text-xs text-slate-400 mt-1">
                        <span className="text-white font-bold text-lg">{goal.current}</span>
                        <span className="text-slate-500"> / {goal.target} {goal.unit}</span>
                    </p>
                </div>
                <button onClick={() => setEditing(true)} className="p-1 text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0">
                    <Edit3 size={14} />
                </button>
            </div>
            <GoalBar pct={pct} color="bg-blue-500" />
            <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-500">{Math.round(pct)}% complete</span>
                <div className="flex items-center gap-1.5">
                    <button onClick={() => onUpdate({ current: Math.max(0, goal.current - 1) })}
                        className="w-6 h-6 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 transition-colors">
                        <Minus size={10} />
                    </button>
                    <button onClick={() => onUpdate({ current: Math.min(goal.target, goal.current + 1) })}
                        className="w-6 h-6 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white transition-colors">
                        <Plus size={10} />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Avatar Picker ────────────────────────────────────────────────────
function AvatarPicker({ initial, gradient, avatarId, imageUrl, onSelect }: { initial: string; gradient: string; avatarId: string; imageUrl?: string | null; onSelect: (id: any) => void }) {
    const [open, setOpen] = useState(false);
    const [imgError, setImgError] = useState(false);
    console.log("[AvatarPicker] Rendering. imageUrl prop:", imageUrl, "imgError:", imgError);

    return (
        <div className="relative flex-shrink-0">
            {/* Current avatar */}
            <button onClick={() => setOpen(p => !p)} className="group relative">
                {imageUrl && !imgError ? (
                    <img
                        src={imageUrl}
                        alt="Profile"
                        referrerPolicy="no-referrer"
                        onError={() => setImgError(true)}
                        className="w-14 h-14 rounded-full border-2 border-white/10 shadow-lg object-cover"
                    />
                ) : (
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-xl font-bold text-white border-2 border-white/10 shadow-lg`}>
                        {initial}
                    </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Palette size={10} className="text-slate-400" />
                </div>
            </button>
            {/* Colour picker dropdown */}
            {open && (
                <div className="absolute top-16 left-0 z-20 glass-panel p-3 rounded-xl shadow-xl border border-slate-700 flex gap-2">
                    {AVATAR_OPTIONS.map(opt => (
                        <button key={opt.id} onClick={() => { onSelect(opt.id); setOpen(false); }}
                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${opt.gradient} transition-transform hover:scale-110 ${avatarId === opt.id ? 'ring-2 ring-white/60 scale-110' : ''}`} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─── Clickable KPI Card ───────────────────────────────────────────────
function KpiCard({ label, icon, value, trend, loading, onClick }: {
    label: string; icon: React.ReactNode; value: number; trend?: number; loading: boolean; onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className={`glass-panel px-5 py-4 ${onClick ? 'cursor-pointer hover:border-violet-500/40 hover:bg-slate-800/60 active:scale-[0.98]' : ''} transition-all border border-transparent`}
        >
            <p className="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2 font-medium">{icon} {label}</p>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-slate-600 mt-1" /> : (
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white">{value}</span>
                    {trend !== undefined && trend !== 0 && <TrendBadge value={trend} />}
                </div>
            )}
            {onClick && !loading && (
                <p className="text-[10px] text-slate-600 mt-1.5">Click to view →</p>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function PersonalDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { goals, setGoals, updateCustomGoal } = usePersonalGoals(session?.user?.email);
    const { avatarId, gradient, setAvatarId } = useAvatar(session?.user?.email);

    const [mainStats, setMainStats] = useState<any>(null);
    const [queueData, setQueueData] = useState<any>(null);
    const [loadingMain, setLoadingMain] = useState(true);
    const [loadingQueue, setLoadingQueue] = useState(true);
    const [editingTicketTarget, setEditingTicketTarget] = useState(false);
    const [ticketTargetDraft, setTicketTargetDraft] = useState('');
    const [queueFilter, setQueueFilter] = useState<QueueFilter>(null);

    useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

    useEffect(() => {
        if (status !== "authenticated") return;
        // For hackathon purposes, assume Mauro is always Tier 2
        const isMauro = session?.user?.email?.toLowerCase().includes("mauro");
        const teamId = isMauro ? "7710348" : "all";
        fetch(`/api/intercom?teamId=${teamId}&timeframe=current_week&lightweight=true`)
            .then(r => r.json()).then(setMainStats).catch(() => { }).finally(() => setLoadingMain(false));
    }, [status, session]);

    useEffect(() => {
        if (status !== "authenticated") return;
        fetch(`/api/intercom/me`)
            .then(r => r.json()).then(setQueueData).catch(() => { }).finally(() => setLoadingQueue(false));
    }, [status]);

    if (status === "loading") return (
        <div className="flex h-[calc(100vh-5rem)] items-center justify-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-violet-500 mr-2" />
        </div>
    );

    const personalWeek = mainStats?.solved?.personal?.week ?? 0;
    const personalMonth = mainStats?.solved?.personal?.month ?? 0;
    const weekTrend = mainStats?.solved?.personal?.weekTrend ?? 0;
    const escalatedCount = mainStats?.solved?.personal?.escalatedCount;
    const breachCount = mainStats?.solved?.personal?.breachCount;
    const isTier2 = escalatedCount !== undefined; // If the backend sent this, we are looking at T2 data

    const leaderboard: any[] = mainStats?.leaderboard ?? [];
    const openCount = queueData?.openCount ?? 0;
    const snoozedCount = queueData?.snoozedCount ?? 0;
    const queue: any[] = queueData?.queue ?? [];
    const monthlyPct = goals.monthlyTicketTarget > 0 ? (personalMonth / goals.monthlyTicketTarget) * 100 : 0;

    const myLeaderEntry = leaderboard.find(e =>
        e.name?.toLowerCase().includes(session?.user?.name?.split(" ")[0]?.toLowerCase() ?? "__")
    );
    const myRank = myLeaderEntry ? leaderboard.indexOf(myLeaderEntry) + 1 : null;
    const initial = (session?.user?.name ?? "?").charAt(0).toUpperCase();

    return (
        <>
            <div className="flex flex-col h-[calc(100vh-5rem)] w-full p-4 gap-4 animate-in fade-in duration-300">

                {/* ── Header + KPI strip ── */}
                <div className="flex-shrink-0 space-y-4">

                    {/* Profile header */}
                    <div className="flex items-center gap-4 glass-panel px-5 py-4">
                        <AvatarPicker initial={initial} gradient={gradient} avatarId={avatarId} imageUrl={session?.user?.image || queueData?.adminAvatarUrl} onSelect={setAvatarId} />
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold text-white leading-tight">{session?.user?.name ?? "My Dashboard"}</h1>
                            <p className="text-sm text-slate-400 mt-0.5">{session?.user?.email}</p>
                            <p className="text-[10px] text-slate-600 mt-1">Tap avatar to change colour</p>
                        </div>
                        {myRank && (
                            <div className="text-right flex-shrink-0">
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Leaderboard</p>
                                <p className="text-3xl font-bold text-yellow-400">#{myRank}</p>
                            </div>
                        )}
                    </div>

                    {/* KPI strip */}
                    <div className="grid grid-cols-4 gap-4">
                        <KpiCard label="Weekly Solves" icon={<Activity size={13} className="text-blue-400" />} value={personalWeek} trend={weekTrend} loading={loadingMain} />
                        {isTier2 ? (
                            <KpiCard label="Escalated to T3" icon={<ArrowUpRight size={13} className="text-rose-400" />} value={escalatedCount ?? 0} loading={loadingMain} />
                        ) : (
                            <KpiCard label="Monthly Solves" icon={<TrendingUp size={13} className="text-violet-400" />} value={personalMonth} loading={loadingMain} />
                        )}
                        <KpiCard label="Open Chats" icon={<MessageSquare size={13} className="text-sky-400" />} value={openCount} loading={loadingQueue}
                            onClick={loadingQueue ? undefined : () => setQueueFilter('open')} />
                        {isTier2 ? (
                            <KpiCard label="SLA Breaches" icon={<AlertTriangle size={13} className="text-amber-400" />} value={breachCount ?? 0} loading={loadingMain} />
                        ) : (
                            <KpiCard label="Snoozed" icon={<Bell size={13} className="text-amber-400" />} value={snoozedCount} loading={loadingQueue}
                                onClick={loadingQueue ? undefined : () => setQueueFilter('snoozed')} />
                        )}
                    </div>
                </div>

                {/* ── Main body: Goals and Leaderboard ── */}
                <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-6 pr-1">
                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

                        {/* Left Side: Goals (spans 3 columns) */}
                        <div className="xl:col-span-3 space-y-4">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                                <Target size={14} className="text-violet-400" /> My Goals & Targets
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {/* Auto-tracked Monthly */}
                                <div className="glass-panel p-5 flex flex-col">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold text-white">Monthly Tickets</p>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-medium">Auto</span>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                <span className="text-white font-bold text-lg">{personalMonth}</span>
                                                <span className="text-slate-500"> / {editingTicketTarget
                                                    ? <input type="number" value={ticketTargetDraft}
                                                        onChange={e => setTicketTargetDraft(e.target.value)}
                                                        className="w-16 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 inline" />
                                                    : goals.monthlyTicketTarget
                                                } tickets</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {editingTicketTarget ? (
                                                <>
                                                    <button onClick={() => { setGoals({ monthlyTicketTarget: Number(ticketTargetDraft) || goals.monthlyTicketTarget }); setEditingTicketTarget(false); }}
                                                        className="p-1.5 rounded-full bg-violet-600 hover:bg-violet-500 text-white transition-colors"><Check size={11} /></button>
                                                    <button onClick={() => setEditingTicketTarget(false)}
                                                        className="p-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"><X size={11} /></button>
                                                </>
                                            ) : (
                                                <button onClick={() => { setTicketTargetDraft(String(goals.monthlyTicketTarget)); setEditingTicketTarget(true); }}
                                                    className="p-1 text-slate-500 hover:text-slate-300 transition-colors"><Edit3 size={14} /></button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-4">
                                        <GoalBar pct={monthlyPct} color="bg-violet-500" />
                                        <p className="text-xs text-slate-500 mt-2">{Math.round(monthlyPct)}% of monthly target</p>
                                    </div>
                                </div>

                                {/* Custom Goals */}
                                {goals.customGoals.map(goal => (
                                    <CustomGoalWidget key={goal.id} goal={goal} onUpdate={patch => updateCustomGoal(goal.id, patch)} />
                                ))}
                            </div>
                        </div>

                        {/* Right Side: Leaderboard (spans 1 column) */}
                        <div className="xl:col-span-1 space-y-4">
                            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-800/60 pb-2">
                                <Zap size={14} className="text-yellow-400" /> This Week's Leaderboard
                            </h2>
                            <div className="glass-panel p-5">
                                {loadingMain ? <Loader2 className="h-5 w-5 animate-spin text-slate-600" /> : (
                                    <div className="space-y-1.5">
                                        {leaderboard.slice(0, 7).map((agent: any, i: number) => {
                                            const isMe = myLeaderEntry && agent.id === myLeaderEntry.id;
                                            return (
                                                <div key={agent.id} className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors ${isMe ? 'bg-violet-500/10 border border-violet-500/20' : 'hover:bg-slate-800/50'}`}>
                                                    <span className={`w-5 text-center text-xs font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-slate-300' : i === 2 ? 'text-amber-600' : 'text-slate-600'}`}>{i + 1}</span>
                                                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 border border-slate-600 flex-shrink-0">{agent.name?.charAt(0)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <span className={`flex text-sm truncate ${isMe ? 'text-violet-300 font-semibold' : 'text-slate-300'}`}>
                                                            {agent.name?.split(' ')[0]}{isMe && <span className="text-violet-500 font-normal ml-1">(you)</span>}
                                                        </span>
                                                        {(agent.escalatedCount ?? 0) > 0 && (
                                                            <span className="text-[10px] text-rose-400 font-medium">Escalated {agent.escalatedCount}</span>
                                                        )}
                                                    </div>
                                                    <span className="text-sm font-bold text-white">{agent.count}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* Queue slide-over modal */}
            <QueueModal filter={queueFilter} queue={queue} onClose={() => setQueueFilter(null)} />
        </>
    );
}
