'use client';

import { ProductStats } from '@/lib/intercom-types';
import { Package, CheckCircle, Clock, BarChart2 } from 'lucide-react';

interface ProductCardProps {
    product: ProductStats;
}

export default function ProductCard({ product }: ProductCardProps) {
    // Determine color based on product name
    const getProductColor = (name: string) => {
        if (name.includes('Reviews')) return 'violet';
        if (name.includes('Influence')) return 'blue';
        if (name.includes('Boost')) return 'orange';
        if (name.includes('Clearer')) return 'emerald';
        if (name.includes('ViralSweep')) return 'pink';
        if (name.includes('Rich Returns')) return 'rose';
        if (name.includes('ConversionBear')) return 'cyan';
        if (name.includes('Address Validator')) return 'indigo';
        return 'slate';
    };


    const color = getProductColor(product.name);

    const colorMap: Record<string, { bg: string, border: string, text: string, icon: string, shadow: string, bar: string }> = {
        violet: { bg: 'bg-violet-500/10', border: 'border-violet-500/20', text: 'text-violet-400', icon: 'text-violet-400', shadow: 'shadow-violet-500/20', bar: 'bg-violet-500' },
        blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-400', shadow: 'shadow-blue-500/20', bar: 'bg-blue-500' },
        orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/20', text: 'text-orange-400', icon: 'text-orange-400', shadow: 'shadow-orange-500/20', bar: 'bg-orange-500' },
        emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-400', shadow: 'shadow-emerald-500/20', bar: 'bg-emerald-500' },
        pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', icon: 'text-pink-400', shadow: 'shadow-pink-500/20', bar: 'bg-pink-500' },
        rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/20', text: 'text-rose-400', icon: 'text-rose-400', shadow: 'shadow-rose-500/20', bar: 'bg-rose-500' },
        cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', icon: 'text-cyan-400', shadow: 'shadow-cyan-500/20', bar: 'bg-cyan-500' },
        indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', text: 'text-indigo-400', icon: 'text-indigo-400', shadow: 'shadow-indigo-500/20', bar: 'bg-indigo-500' },
        slate: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', text: 'text-slate-400', icon: 'text-slate-400', shadow: 'shadow-slate-500/20', bar: 'bg-slate-500' },
    };

    const theme = colorMap[color] || colorMap.slate;

    return (
        <div className="glass-panel p-6 relative overflow-hidden group hover:border-violet-500/50 transition-all duration-300">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${theme.bg} border ${theme.border}`}>
                        <Package className={`h-5 w-5 ${theme.icon}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-white tracking-tight">{product.name}</h3>
                </div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-widest bg-slate-800/50 px-2.5 py-1 rounded-full border border-slate-700/50">
                    Live
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Weekly Solves */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Week Solved</p>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-white">{product.weekSolved}</span>
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span className={`text-[10px] font-bold ${product.trend >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {product.trend > 0 ? '+' : ''}{product.trend}%
                        </span>
                    </div>

                </div>

                {/* CSAT */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">CSAT</p>
                    <div className="flex items-baseline space-x-2">
                        {product.csat !== null && product.csat !== undefined ? (
                            <span className={`text-2xl font-bold ${product.csat >= 90 ? 'text-emerald-400' :
                                product.csat >= 75 ? 'text-amber-400' : 'text-rose-400'
                                }`}>
                                {product.csat}%
                            </span>
                        ) : (
                            <span className="text-lg font-semibold text-slate-500 italic">Pending</span>
                        )}
                    </div>
                </div>

                {/* Pending */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pending</p>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-white">{product.pending}</span>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </div>
                </div>

                {/* Monthly */}
                <div className="space-y-1">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Month</p>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-slate-300">{product.monthSolved}</span>
                        <BarChart2 className="h-4 w-4 text-slate-500" />
                    </div>
                </div>
            </div>

            {/* Mini Progress Bar for Monthly Goal (Arbitrary 100 for now) */}
            <div className="mt-6 space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    <span>Monthly Progress</span>
                    <span>{Math.round((product.monthSolved / 500) * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                    <div
                        className={`h-full ${theme.bar} transition-all duration-1000 shadow-[0_0_10px_rgba(var(--${color}-500),0.5)]`}
                        style={{ width: `${Math.min(100, (product.monthSolved / 500) * 100)}%` }}
                    />
                </div>
            </div>
        </div>
    );
}

