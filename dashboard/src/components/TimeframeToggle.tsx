'use client';

import { useRef, useState } from 'react';
import { TimeframeType } from '@/lib/intercom-types';
import { getTimeframeConfig } from '@/lib/timeframe-config';
import { Calendar, ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { useClickAway } from 'react-use';

interface TimeframeToggleProps {
    currentTimeframe: TimeframeType;
    onTimeframeChange: (timeframe: TimeframeType) => void;
}

const TIMEFRAMES: TimeframeType[] = ['current_week', 'past_7_days', 'past_30_days', 'past_60_days', 'past_90_days'];

export default function TimeframeToggle({ currentTimeframe, onTimeframeChange }: TimeframeToggleProps) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const prefetchedRef = useRef<Set<TimeframeType>>(new Set());

    const activeConfig = getTimeframeConfig(currentTimeframe);

    useClickAway(ref, () => {
        setIsOpen(false);
    });

    // Pre-warm server cache on hover
    const handleMouseEnter = (timeframe: TimeframeType) => {
        if (timeframe === currentTimeframe) return;
        if (prefetchedRef.current.has(timeframe)) return;
        prefetchedRef.current.add(timeframe);

        // Fetch just with current tier assumption (we don't know tier here, but standard params)
        const url = `/api/intercom?timeframe=${timeframe}`;
        fetch(url).catch(() => { });
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-slate-800/50 text-slate-300 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white transition-all duration-200"
                title="Select historical timeframe"
            >
                <Calendar size={16} className="text-violet-400" />
                <span className="text-sm font-medium">{activeConfig.name}</span>
                <ChevronDown size={14} className={clsx("transition-transform duration-200 text-slate-500", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                    {TIMEFRAMES.map((tf) => {
                        const config = getTimeframeConfig(tf);
                        const isActive = currentTimeframe === tf;

                        return (
                            <button
                                key={tf}
                                onClick={() => {
                                    onTimeframeChange(tf);
                                    setIsOpen(false);
                                }}
                                onMouseEnter={() => handleMouseEnter(tf)}
                                className={clsx(
                                    "w-full text-left px-4 py-2.5 text-sm transition-colors duration-150 flex items-center justify-between",
                                    isActive
                                        ? "bg-violet-600/20 text-violet-300 font-medium"
                                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                                )}
                            >
                                <span>{config.name}</span>
                                {isActive && <div className="h-1.5 w-1.5 rounded-full bg-violet-400" />}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
