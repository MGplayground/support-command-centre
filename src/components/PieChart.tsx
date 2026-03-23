interface PieChartProps {
    data: Array<{ label: string; value: number; color: string }>;
    size?: number;
}

export default function PieChart({ data, size = 120 }: PieChartProps) {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <div
                className="rounded-full bg-slate-800/30 flex items-center justify-center"
                style={{ width: size, height: size }}
            >
                <span className="text-xs text-slate-500">No data</span>
            </div>
        );
    }

    // Calculate percentages and cumulative angles for conic-gradient
    let currentAngle = 0;
    const gradientStops = data.map((item) => {
        const percentage = (item.value / total) * 100;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        return `${item.color} ${startAngle}deg ${endAngle}deg`;
    }).join(', ');

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Pie Chart */}
            <div
                className="rounded-full relative shadow-lg"
                style={{
                    width: size,
                    height: size,
                    background: `conic-gradient(${gradientStops})`,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 0 0 2px rgba(255, 255, 255, 0.1)'
                }}
            >
                {/* Center hole for donut effect */}
                <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900/90 flex flex-col items-center justify-center"
                    style={{ width: size * 0.5, height: size * 0.5 }}
                >
                    <span className="text-2xl font-black text-white">{total}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">Total</span>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-2 justify-center">
                {data.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                        <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[10px] font-semibold text-slate-300">
                            {item.label} ({item.value})
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
