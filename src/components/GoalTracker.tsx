import { useState, useEffect } from 'react';
import { Target, Plus, Flame, Trash2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

interface Goal {
    id: string;
    title: string;
    current: number;
    target: number;
    unit: string;
}

export default function GoalTracker() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [newGoal, setNewGoal] = useState<Partial<Goal>>({ title: '', current: 0, target: 100, unit: '' });

    // Load from local storage on mount
    useEffect(() => {
        const savedGoals = localStorage.getItem('quarterly_goals');
        if (savedGoals) {
            setGoals(JSON.parse(savedGoals));
        } else {
            // Default example goal
            setGoals([{
                id: '1',
                title: 'Close Tickets',
                current: 245,
                target: 500,
                unit: 'tickets'
            }]);
        }
    }, []);

    // Save to local storage whenever goals change
    useEffect(() => {
        localStorage.setItem('quarterly_goals', JSON.stringify(goals));
    }, [goals]);

    const addGoal = () => {
        if (!newGoal.title || !newGoal.target) return;

        const goal: Goal = {
            id: Date.now().toString(),
            title: newGoal.title,
            current: Number(newGoal.current) || 0,
            target: Number(newGoal.target),
            unit: newGoal.unit || ''
        };

        setGoals([...goals, goal]);
        setIsAdding(false);
        setNewGoal({ title: '', current: 0, target: 100, unit: '' });
    };

    const deleteGoal = (id: string) => {
        setGoals(goals.filter(g => g.id !== id));
    };

    const updateProgress = (id: string, delta: number) => {
        setGoals(goals.map(g => {
            if (g.id === id) {
                const newCurrent = Math.max(0, g.current + delta);
                return { ...g, current: newCurrent };
            }
            return g;
        }));
    };

    const getProgressColor = (percent: number) => {
        if (percent >= 100) return ['#22c55e', '#4ade80']; // Green
        if (percent >= 80) return ['#f97316', '#fbbf24'];  // Orange/Fire
        if (percent >= 50) return ['#a855f7', '#d8b4fe'];  // Purple
        return ['#0ea5e9', '#38bdf8'];                     // Blue
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="section-label mb-0">
                    <Target className="w-3.5 h-3.5 text-cyan-400" />
                    QUARTERLY GOALS
                </h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                    <Plus className="w-4 h-4" />
                </button>
            </div>

            {/* Add Goal Form */}
            {isAdding && (
                <div className="liquid-tile p-4 space-y-4 animate-in fade-in slide-in-from-top-2 border border-cyan-500/30 bg-cyan-950/20">
                    <div>
                        <label className="text-[10px] font-bold text-cyan-300 uppercase mb-2 block tracking-wider">Goal Title</label>
                        <input
                            type="text"
                            className="liquid-input text-sm bg-slate-900/60 focus:bg-slate-900/80"
                            placeholder="e.g. 5-Star Ratings"
                            value={newGoal.title}
                            onChange={e => setNewGoal({ ...newGoal, title: e.target.value })}
                            autoFocus
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-cyan-300 uppercase mb-2 block tracking-wider">Target</label>
                            <input
                                type="number"
                                className="liquid-input text-sm bg-slate-900/60 focus:bg-slate-900/80"
                                placeholder="100"
                                value={newGoal.target}
                                onChange={e => setNewGoal({ ...newGoal, target: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-cyan-300 uppercase mb-2 block tracking-wider">Unit</label>
                            <input
                                type="text"
                                className="liquid-input text-sm bg-slate-900/60 focus:bg-slate-900/80"
                                placeholder="reviews"
                                value={newGoal.unit}
                                onChange={e => setNewGoal({ ...newGoal, unit: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                        <button
                            onClick={() => setIsAdding(false)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:bg-white/5 transition-colors"
                        >
                            CANCEL
                        </button>
                        <button
                            onClick={addGoal}
                            className="liquid-button primary px-4 py-1.5 text-xs"
                        >
                            <Check className="w-3.5 h-3.5" />
                            SAVE GOAL
                        </button>
                    </div>
                </div>
            )}

            {/* Goals List */}
            <div className="space-y-3">
                {goals.map(goal => {
                    const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
                    const colors = getProgressColor(percent);
                    const isOnFire = percent >= 80;

                    return (
                        <div key={goal.id} className="liquid-tile p-4 relative group hover:border-cyan-500/30 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white tracking-wide">{goal.title}</span>
                                        {isOnFire && percent < 100 && (
                                            <Flame className="w-3.5 h-3.5 text-orange-400 fill-orange-400 animate-pulse" />
                                        )}
                                        {percent >= 100 && (
                                            <Check className="w-3.5 h-3.5 text-green-400 stroke-[3]" />
                                        )}
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                                        <span className="text-white font-bold">{goal.current}</span>
                                        <span className="opacity-40">/</span>
                                        <span>{goal.target} <span className="text-slate-500">{goal.unit}</span></span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/50 rounded-lg p-1 border border-white/10 backdrop-blur-md shadow-lg">
                                    <button
                                        onClick={() => updateProgress(goal.id, -1)}
                                        className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                    >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => updateProgress(goal.id, 1)}
                                        className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                                    >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="w-px h-3 bg-white/10 mx-0.5"></div>
                                    <button
                                        onClick={() => deleteGoal(goal.id)}
                                        className="p-1 hover:bg-red-500/20 rounded hover:text-red-400 text-slate-500 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-end justify-end mb-1.5">
                                <div className="text-xs font-bold" style={{ color: colors[1] }}>
                                    {percent}%
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2 w-full liquid-progress-bg overflow-hidden rounded-full">
                                <div
                                    className="liquid-progress-fill h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${percent}%`,
                                        background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
                                        boxShadow: `0 0 10px ${colors[1]}60`
                                    }}
                                ></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
