import 'react';

interface CSATGaugeProps {
    percentage: number;
    positiveRatings: number;
    totalRatings: number;
    timeframe?: 'week' | 'month';
    onClick?: () => void;
    hasRemarks?: boolean;
    pending?: number;
}

export default function CSATGauge({ percentage, positiveRatings, totalRatings, timeframe = 'week', onClick, hasRemarks, pending = 0 }: CSATGaugeProps) {
    // Determine color based on thresholds (Updated spec: >90% Green, 75-89% Yellow, <75% Red)
    // Handle Pending State: No ratings yet, but requests sent
    const isPending = totalRatings === 0 && pending > 0;

    const getColor = () => {
        if (isPending) return { primary: '#94a3b8', glow: 'rgba(148, 163, 184, 0.4)', label: 'Pending', status: 'neutral' };
        if (percentage > 90) return { primary: '#10b981', glow: 'rgba(16, 185, 129, 0.5)', label: 'Excellent', status: 'great' };
        if (percentage >= 75) return { primary: '#fbbf24', glow: 'rgba(251, 191, 36, 0.4)', label: 'Good', status: 'warning' };
        return { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.5)', label: 'Needs Improvement', status: 'critical' };
    };

    const color = getColor();
    const strokeDashoffset = isPending ? 0 : 282 - (282 * percentage) / 100; // Full circle if pending (outline) or 0? 
    // If pending, maybe empty circle or full gray? Let's do full gray outline.
    // strokeDashoffset = 0 means full likely.

    // If pending, show '0%' or '?' or 'Pending'?
    // User said "default to a neutral 'Pending' state". I'll show 'Pending' text or '--'.
    const displayValue = isPending ? '--' : `${totalRatings > 0 ? percentage : 0}%`;

    const isCritical = color.status === 'critical';

    return (
        <div
            className={`flex flex-col items-center gap-4 ${onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''}`}
            onClick={onClick}
        >
            {/* Circular Gauge */}
            <div className="relative" style={{ width: 120, height: 120 }}>
                {/* Background circle */}
                <svg className="transform -rotate-90" width="120" height="120">
                    <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.05)"
                        strokeWidth="10"
                    />
                    {/* Progress circle */}
                    <circle
                        cx="60"
                        cy="60"
                        r="45"
                        fill="none"
                        stroke={color.primary}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray="282"
                        strokeDashoffset={strokeDashoffset}
                        className={isCritical ? 'animate-pulse-slow' : ''}
                        style={{
                            transition: 'stroke-dashoffset 1s ease-out, stroke 0.3s ease',
                            filter: `drop-shadow(0 0 8px ${color.glow})`
                        }}
                    />
                </svg>

                {/* Center content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div
                        className={`text-3xl font-black text-white ${isCritical ? 'animate-pulse' : ''}`}
                        style={{ color: color.primary }}
                    >
                        {displayValue}
                    </div>
                    <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                        CSAT
                    </div>
                </div>

                {hasRemarks && (
                    <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-slate-900 animate-bounce">
                        !
                    </div>
                )}
            </div>

            {/* Stats below gauge */}
            <div className="text-center">
                <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: color.primary }}>
                    {color.label}
                </div>
                <div className="text-[10px] text-slate-400">
                    <span className="font-bold text-white">{positiveRatings}</span> positive / {' '}
                    <span className="font-bold text-white">{totalRatings}</span> total
                </div>
                <div className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-widest">
                    {timeframe}
                </div>
            </div>
        </div>
    );
}
