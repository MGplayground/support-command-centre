'use client';

import { ProductStats } from '@/lib/intercom-types';
import {
    ArrowLeft,
    Trophy,
    CheckCircle,
    Clock,
    BarChart2,
    Users,
    TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';

interface ProductDetailViewProps {
    product: ProductStats;
    onBack: () => void;
}

export default function ProductDetailView({ product, onBack }: ProductDetailViewProps) {
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
    const colorClasses = {
        violet: { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', shadow: 'shadow-violet-500/20' },
        blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', shadow: 'shadow-blue-500/20' },
        orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', shadow: 'shadow-orange-500/20' },
        emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', shadow: 'shadow-emerald-500/20' },
        pink: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', shadow: 'shadow-pink-500/20' },
        rose: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', shadow: 'shadow-rose-500/20' },
        cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', shadow: 'shadow-cyan-500/20' },
        indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', shadow: 'shadow-indigo-500/20' },
        slate: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20', shadow: 'shadow-slate-500/20' },
    };
    const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.slate;


    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Breadcrumbs & Title */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 uppercase tracking-widest mb-1">
                            <span>Products</span>
                            <span>/</span>
                            <span className={colorClass.text}>{product.name}</span>
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">
                            {product.name} Dashboard
                        </h1>
                    </div>
                </div>

                <div className="flex items-center space-x-2 bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-slate-300">Live Brand Insights</span>
                </div>
            </div>

            {/* Hero Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricBox
                    title="Weekly Solves"
                    value={product.weekSolved}
                    icon={<CheckCircle className="text-emerald-400" />}
                    trend={`${product.trend > 0 ? '+' : ''}${product.trend}%`}
                />

                <MetricBox
                    title="CSAT Score"
                    value={product.csat !== null && product.csat !== undefined ? `${product.csat}%` : 'Pending'}
                    icon={<TrendingUp className={product.csat !== null && product.csat >= 90 ? 'text-emerald-400' : product.csat !== null ? 'text-amber-400' : 'text-slate-500'} />}
                    subtitle={`${product.csat !== null ? 'Based on latest solves' : 'No ratings received yet'}`}
                />
                <MetricBox
                    title="Active Conversations"
                    value={product.pending}
                    icon={<Clock className="text-amber-400" />}
                    subtitle="Waiting for response"
                />
                <MetricBox
                    title="Monthly Total"
                    value={product.monthSolved}
                    icon={<BarChart2 className="text-blue-400" />}
                    subtitle="Total volume"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Product Leaderboard */}
                <div className="lg:col-span-2 glass-panel p-6">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                <Trophy className="h-5 w-5 text-yellow-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-white uppercase tracking-wider">Top Performers for {product.name}</h3>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {product.leaderboard && product.leaderboard.length > 0 ? (
                            product.leaderboard.map((agent, index) => (
                                <div key={agent.id} className="flex items-center p-4 rounded-xl bg-slate-800/30 border border-slate-700/30 hover:border-violet-500/30 transition-all group">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-800 text-slate-400 text-sm font-bold mr-4 border border-slate-700 group-hover:border-violet-500/50 transition-colors">
                                        {index + 1}
                                    </div>

                                    <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-slate-700 bg-slate-800 mr-4">
                                        {agent.avatar ? (
                                            <img src={agent.avatar} alt={agent.name} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-slate-400 text-xs">
                                                {agent.name.charAt(0)}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1">
                                        <h4 className="text-white font-medium">{agent.name}</h4>
                                        <div className="w-full bg-slate-700/30 h-1.5 rounded-full mt-2 overflow-hidden">
                                            <div
                                                className={`h-full bg-gradient-to-r from-${color}-500 to-${color}-400 rounded-full shadow-[0_0_8px_rgba(var(--${color}-500),0.3)]`}
                                                style={{ width: `${(agent.count / (product.leaderboard![0].count || 1)) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="text-right pl-6">
                                        <span className="text-2xl font-bold text-white block">{agent.count}</span>
                                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Solves</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                                <Users className="h-12 w-12 mb-4 opacity-20" />
                                <p>No agent data for this product today.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Brand Health / Stats */}
                <div className="space-y-8">
                    <div className="glass-panel p-6">
                        <h3 className="text-lg font-semibold text-white mb-6 uppercase tracking-wider flex items-center">
                            <BarChart2 className="mr-2 h-5 w-5 text-blue-400" />
                            Volume Analysis
                        </h3>

                        <div className="space-y-6">
                            <StatBar label="T1 Contribution" value="65%" color="bg-violet-500" />
                            <StatBar label="T2 Escalation" value="35%" color="bg-blue-500" />
                            <StatBar label="Auto-Resolved" value="12%" color="bg-emerald-500" />
                        </div>
                    </div>

                    <div className="glass-panel p-6 bg-gradient-to-br from-violet-600/10 to-blue-600/10 border-violet-500/20">
                        <h3 className="text-md font-semibold text-white mb-2">Product Insight</h3>
                        <p className="text-slate-400 text-sm leading-relaxed italic">
                            {product.csat !== null
                                ? `"Conversations for ${product.name} are currently peaking between 10 AM - 2 PM. CSAT is holding stable at ${product.csat}%."`
                                : `"${product.name} has no CSAT ratings yet this period. Volume is at ${product.weekSolved} solves this week."`
                            }
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function MetricBox({ title, value, icon, trend, subtitle }: { title: string, value: string | number, icon: React.ReactNode, trend?: string, subtitle?: string }) {
    return (
        <div className="glass-panel p-6 group hover:border-slate-500/50 transition-all">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">{title}</h3>
                <div className="p-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 group-hover:scale-110 transition-transform">
                    {icon}
                </div>
            </div>
            <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-bold text-white tracking-tight">{value}</span>
                {trend && <span className="text-xs font-bold text-emerald-400">{trend}</span>}
            </div>
            {subtitle && <p className="text-xs text-slate-500 mt-2">{subtitle}</p>}
        </div>
    );
}

function StatBar({ label, value, color }: { label: string, value: string, color: string }) {
    return (
        <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-slate-400">{label}</span>
                <span className="text-white">{value}</span>
            </div>
            <div className="h-2 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                <div className={`h-full ${color} rounded-full`} style={{ width: value }} />
            </div>
        </div>
    );
}
