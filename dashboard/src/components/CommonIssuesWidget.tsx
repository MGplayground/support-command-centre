import React, { useState } from 'react';
import { Layers, Bug, Repeat, DollarSign, PenTool, Lightbulb, FileText, Activity } from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface CommonIssueTheme {
    issue_theme: string;
    frequency: number;
    example_ticket: string;
}

interface CommonIssuesWidgetProps {
    issues?: CommonIssueTheme[];
}

export default function CommonIssuesWidget({ issues = [] }: CommonIssuesWidgetProps) {
    const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

    if (!issues) {
        return (
            <div className="glass-panel p-6 flex flex-col items-center justify-center text-slate-500 h-full min-h-[300px]">
                <Activity size={48} className="text-slate-600/50 mb-4 animate-pulse" />
                <p>Analyzing recent resolutions...</p>
            </div>
        );
    }

    if (issues.length === 0) {
        return (
            <div className="glass-panel p-6 flex flex-col items-center justify-center text-slate-500 h-full min-h-[300px]">
                <FileText size={48} className="text-slate-600/50 mb-4" />
                <p>No recent issue trends found.</p>
                <p className="text-xs text-slate-600 mt-2">Checking the past 30 days...</p>
            </div>
        );
    }

    const getThemeIcon = (theme: string) => {
        const t = theme.toLowerCase();
        if (t.includes('bug') || t.includes('technical')) return <Bug size={14} className="text-rose-400" />;
        if (t.includes('pric') || t.includes('bill')) return <DollarSign size={14} className="text-emerald-400" />;
        if (t.includes('onboard') || t.includes('setup')) return <Repeat size={14} className="text-blue-400" />;
        if (t.includes('request') || t.includes('feature')) return <Lightbulb size={14} className="text-amber-400" />;
        if (t.includes('how-to') || t.includes('guide')) return <FileText size={14} className="text-cyan-400" />;
        return <PenTool size={14} className="text-purple-400" />;
    };

    const getThemeColor = (theme: string) => {
        const t = theme.toLowerCase();
        if (t.includes('bug') || t.includes('technical')) return 'bg-rose-500/10 border-rose-500/20 text-rose-300';
        if (t.includes('pric') || t.includes('bill')) return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300';
        if (t.includes('onboard') || t.includes('setup')) return 'bg-blue-500/10 border-blue-500/20 text-blue-300';
        if (t.includes('request') || t.includes('feature')) return 'bg-amber-500/10 border-amber-500/20 text-amber-300';
        if (t.includes('how-to') || t.includes('guide')) return 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300';
        return 'bg-purple-500/10 border-purple-500/20 text-purple-300';
    };

    // Calculate total for percentage bars
    const totalIssues = issues.reduce((acc, curr) => acc + curr.frequency, 0);

    // Strip HTML from raw ticket body for cleaner preview
    const stripHtml = (html: string) => {
        if (!html) return '';
        return html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    };

    return (
        <div className="glass-panel p-6 flex flex-col h-full relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute -top-10 -right-10 opacity-[0.03] pointer-events-none">
                <Layers size={200} />
            </div>

            <div className="flex justify-between items-center mb-6 z-10">
                <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-white">Top Resolved Issues</h3>
                    <div className="flex items-center px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-bold uppercase tracking-wider">
                        Past 30 Days
                    </div>
                </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar z-10">
                {issues.map((issue) => {
                    const isSelected = selectedTheme === issue.issue_theme;
                    const percent = Math.round((issue.frequency / totalIssues) * 100);

                    return (
                        <div
                            key={issue.issue_theme}
                            className={clsx(
                                "rounded-xl border transition-all cursor-pointer overflow-hidden",
                                isSelected ? "bg-slate-800/80 border-violet-500/30 ring-1 ring-violet-500/20" : "bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-600"
                            )}
                            onClick={() => setSelectedTheme(isSelected ? null : issue.issue_theme)}
                        >
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-3 w-1/3">
                                    <span className={clsx("flex items-center justify-center w-8 h-8 rounded border", getThemeColor(issue.issue_theme))}>
                                        {getThemeIcon(issue.issue_theme)}
                                    </span>
                                    <span className="text-sm font-medium text-slate-200 capitalize tracking-wide">{issue.issue_theme}</span>
                                </div>
                                <div className="flex-1 px-4">
                                     <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-violet-500 rounded-full"
                                            style={{ width: `${percent}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="w-16 text-right">
                                    <span className="text-lg font-bold text-white">{issue.frequency}</span>
                                    <span className="text-xs text-slate-500 block">cases</span>
                                </div>
                            </div>
                            
                            {/* Expandable Example Snippet */}
                            <div className={clsx(
                                "bg-slate-900/50 border-t border-slate-800 transition-all duration-300 ease-in-out px-4 overflow-hidden",
                                isSelected ? "py-4 max-h-48 opacity-100" : "max-h-0 opacity-0 py-0"
                            )}>
                                <h4 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 flex items-center">
                                    <FileText size={10} className="mr-1" />
                                    Example Ticket Snippet
                                </h4>
                                <p className="text-sm text-slate-300 italic line-clamp-3 pl-3 border-l-2 border-violet-500/30">
                                    "{stripHtml(issue.example_ticket)}"
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
