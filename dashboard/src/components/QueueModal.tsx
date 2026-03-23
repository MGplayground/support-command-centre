"use client";

import { X, ExternalLink, MessageSquare, Bell, AlertCircle } from "lucide-react";
import { useEffect } from "react";

const STAGE_CONFIG: Record<string, { color: string; bg: string; border: string }> = {
    'Open': { color: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
    'Snoozed': { color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    'Raised with T3': { color: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
    'Raised with T2': { color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
    'Billing': { color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
};

function StageBadge({ stage }: { stage: string }) {
    const cfg = STAGE_CONFIG[stage] ?? STAGE_CONFIG['Open'];
    return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border} whitespace-nowrap`}>
            {stage}
        </span>
    );
}

function timeAgo(ts: number) {
    if (!ts) return '—';
    const diff = Math.floor((Date.now() / 1000 - ts) / 60);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
}

export type QueueFilter = 'open' | 'snoozed' | null;

interface Props {
    filter: QueueFilter;
    queue: any[];
    onClose: () => void;
}

export default function QueueModal({ filter, queue, onClose }: Props) {
    const isOpen = filter !== null;

    // Close on Escape
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    const filtered = queue.filter(c => {
        if (filter === 'open') return c.state === 'open';
        if (filter === 'snoozed') return c.state === 'snoozed';
        return true;
    });

    const title = filter === 'open' ? 'Open Chats' : filter === 'snoozed' ? 'Snoozed Chats' : 'My Queue';
    const Icon = filter === 'snoozed' ? Bell : MessageSquare;
    const iconColor = filter === 'snoozed' ? 'text-amber-400' : 'text-sky-400';

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Slide-over panel */}
            <div className={`fixed inset-y-0 right-0 z-50 w-full max-w-2xl flex flex-col bg-slate-900 border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Header */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800 flex-shrink-0">
                    <Icon size={18} className={iconColor} />
                    <div>
                        <h2 className="text-lg font-bold text-white">{title}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">{filtered.length} conversation{filtered.length !== 1 ? 's' : ''}</p>
                    </div>
                    <button onClick={onClose} className="ml-auto p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Table header */}
                {filtered.length > 0 && (
                    <div className="px-6 py-2.5 grid grid-cols-12 gap-4 text-xs text-slate-500 uppercase tracking-wider bg-slate-900/60 border-b border-slate-800 flex-shrink-0 font-medium">
                        <div className="col-span-6">Conversation</div>
                        <div className="col-span-2">Stage</div>
                        <div className="col-span-2">Updated</div>
                        <div className="col-span-2">
                            {filter === 'snoozed' ? 'Wakes' : 'Status'}
                        </div>
                    </div>
                )}

                {/* Conversation list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-3">
                            <AlertCircle size={36} className="text-slate-700" />
                            <p className="text-base font-medium">No {title.toLowerCase()} right now</p>
                            <p className="text-sm text-slate-600">Check back later</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-800/60">
                            {filtered.map((conv) => (
                                <a
                                    key={conv.id}
                                    href={conv.intercomUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="grid grid-cols-12 gap-4 px-6 py-4 items-start hover:bg-slate-800/50 transition-colors group"
                                >
                                    <div className="col-span-6 min-w-0">
                                        <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors leading-snug">
                                            {conv.subject}
                                        </p>
                                        {conv.tags?.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {conv.tags.slice(0, 3).map((tag: string) => (
                                                    <span key={tag} className="px-1.5 py-0.5 bg-slate-800 text-slate-400 rounded text-[10px]">{tag}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-2">
                                        <StageBadge stage={conv.stage} />
                                    </div>
                                    <div className="col-span-2 text-sm text-slate-400 pt-0.5">
                                        {timeAgo(conv.updatedAt)}
                                    </div>
                                    <div className="col-span-2 flex items-start gap-2 pt-0.5">
                                        {conv.snoozedUntil ? (
                                            <span className="text-xs text-amber-400/90 leading-snug">
                                                {new Date(conv.snoozedUntil * 1000).toLocaleDateString('en-GB', {
                                                    weekday: 'short', day: 'numeric', month: 'short',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </span>
                                        ) : (
                                            <ExternalLink size={13} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-0.5" />
                                        )}
                                    </div>
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
