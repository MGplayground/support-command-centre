'use client';

import { IntercomStats } from '@/lib/intercom-types';
import { CheckCircle, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';

// Product color map for ticker pills
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

export default function LiveTicker({ stats }: { stats: IntercomStats | null }) {
    const [offset, setOffset] = useState(0);

    // If no stats or empty recent solves, don't render or render fixed message
    if (!stats?.chatVolume?.recentSolves || stats.chatVolume.recentSolves.length === 0) {
        return null;
    }

    const solves = stats.chatVolume.recentSolves;

    return (
        <div className="fixed bottom-0 left-0 right-0 h-10 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 flex items-center z-50 overflow-hidden">
            <div className="flex items-center px-4 h-full bg-slate-900 border-r border-slate-800 shrink-0 z-10">
                <Flame className="h-4 w-4 text-orange-500 mr-2 animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">Live Activity</span>
            </div>

            <div className="flex items-center whitespace-nowrap animate-ticker pl-4 space-x-8">
                {/* Repeat list twice for seamless loop if using CSS animation, 
                    but for now a simple overflow-x-auto or marquee effect is fine. 
                    Let's utilize a simple CSS animation defined in global css or inline style.
                */}
                {[...solves, ...solves].map((solve, i) => { // Double metrics for loop
                    const color = getProductColor(solve.product);
                    const timeAgo = Math.floor((Date.now() - solve.timestamp) / 60000);

                    return (
                        <div key={`${solve.id}-${i}`} className="flex items-center space-x-2">
                            <div className="relative h-5 w-5 rounded-full overflow-hidden border border-slate-700 bg-slate-800">
                                {solve.agentAvatar ? (
                                    <img src={solve.agentAvatar} alt={solve.agent} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center text-[8px] text-slate-400">
                                        {solve.agent.charAt(0)}
                                    </div>
                                )}
                            </div>
                            <span className="text-xs text-slate-300">
                                <span className="font-semibold text-white">{solve.agent}</span> solved
                                <span className={`mx-1 text-${color}-400 font-medium`}>{solve.product}</span>
                                <span className="opacity-50">{timeAgo < 1 ? 'just now' : `${timeAgo}m ago`}</span>
                            </span>
                        </div>
                    );
                })}
            </div>

            <style jsx>{`
                @keyframes ticker {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                .animate-ticker {
                    animation: ticker 30s linear infinite;
                }
                .animate-ticker:hover {
                    animation-play-state: paused;
                }
            `}</style>
        </div>
    );
}
