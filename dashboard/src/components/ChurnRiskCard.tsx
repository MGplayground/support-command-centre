'use client';

import { ChurnRiskAccount } from '@/lib/intercom-types';
import { AlertCircle, Bug, DollarSign, Repeat, ShieldAlert, Sparkles, UserX } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChurnRiskCardProps {
    accounts?: ChurnRiskAccount[];
}

export default function ChurnRiskCard({ accounts }: ChurnRiskCardProps) {
    if (accounts === undefined) {
        return (
            <div className="glass-panel p-6 flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
                <ShieldAlert size={48} className="text-slate-600/50 mb-4 animate-pulse" />
                <p>Analyzing customer sentiment...</p>
            </div>
        );
    }

    if (accounts.length === 0) {
        return (
            <div className="glass-panel p-6 flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
                <ShieldAlert size={48} className="text-emerald-500/20 mb-4" />
                <p>No high-risk accounts detected recently.</p>
            </div>
        );
    }

    // Helper to map Databricks AI driver classification to UI elements
    const getDriverIcon = (driver: string) => {
        const d = driver.toLowerCase();
        if (d.includes('bug') || d.includes('technical')) return <Bug size={14} className="text-rose-400" />;
        if (d.includes('pric') || d.includes('cost')) return <DollarSign size={14} className="text-amber-400" />;
        if (d.includes('onboard')) return <Repeat size={14} className="text-blue-400" />;
        return <UserX size={14} className="text-purple-400" />;
    };

    const getDriverColor = (driver: string) => {
        const d = driver.toLowerCase();
        if (d.includes('bug') || d.includes('technical')) return 'bg-rose-500/10 border-rose-500/20 text-rose-300';
        if (d.includes('pric') || d.includes('cost')) return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
        if (d.includes('onboard')) return 'bg-blue-500/10 border-blue-500/20 text-blue-300';
        return 'bg-purple-500/10 border-purple-500/20 text-purple-300';
    };

    return (
        <div className="glass-panel p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-white">Churn Risk Radar</h3>
                    <div className="flex items-center px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold uppercase tracking-wider tooltip-trigger relative group cursor-help">
                        <Sparkles size={10} className="mr-1" />
                        AI Detected
                        {/* Tooltip */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-slate-800 border border-slate-700 rounded shadow-xl text-slate-300 text-xs normal-case tracking-normal opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            Drivers classified via Databricks native `ai_classify()` on negative reviews.
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                {accounts.map((account) => (
                    <div
                        key={account.id}
                        className="p-4 rounded-xl bg-slate-800/40 border border-rose-500/10 hover:border-rose-500/30 hover:bg-slate-800/60 transition-all flex flex-col"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="text-slate-200 font-medium">{account.customerName}</h4>
                                <p className="text-slate-500 text-xs">{account.customerEmail}</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-slate-500 mb-1">
                                    {formatDistanceToNow(account.updatedAt * 1000, { addSuffix: true })}
                                </span>
                                <span className={`flex items-center text-[10px] px-2 py-1 rounded-full border ${getDriverColor(account.churnDriver)}`}>
                                    <span className="mr-1.5">{getDriverIcon(account.churnDriver)}</span>
                                    {account.churnDriver.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <div className="mt-2 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500/50" />
                            <p className="text-sm text-slate-300 italic pl-1">
                                "{account.review}"
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
