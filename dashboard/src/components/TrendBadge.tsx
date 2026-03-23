import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendBadgeProps {
    value: number;
    suffix?: string;
    inverse?: boolean; // If true, negative is good (e.g., FRT decrease)
}

export default function TrendBadge({ value, suffix = '%', inverse = false }: TrendBadgeProps) {
    if (value === 0) {
        return (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-700/50 text-slate-400">
                <Minus size={12} className="mr-1" />
                No change
            </span>
        );
    }

    const isPositive = inverse ? value < 0 : value > 0;
    const Icon = value > 0 ? TrendingUp : TrendingDown;

    const colorClasses = isPositive
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : 'bg-red-500/10 text-red-400 border-red-500/20';

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClasses}`}>
            <Icon size={12} className="mr-1" />
            {Math.abs(value)}{suffix}
        </span>
    );
}
