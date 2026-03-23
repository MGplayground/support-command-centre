'use client';
import { useState, useEffect, useCallback } from 'react';

export interface CustomGoal {
    id: string;
    title: string;
    target: number;
    current: number;
    unit: string; // e.g. "articles", "calls", "reviews"
}

export interface PersonalGoals {
    // Auto-tracked
    monthlyTicketTarget: number;
    // User-defined custom goals (max 2 to keep UI clean)
    customGoals: CustomGoal[];
}

const DEFAULT_CUSTOM_GOALS: CustomGoal[] = [
    { id: 'cg1', title: 'Q1 Goal', target: 10, current: 0, unit: 'items' },
    { id: 'cg2', title: 'Q2 Goal', target: 10, current: 0, unit: 'items' },
];

const DEFAULTS: PersonalGoals = {
    monthlyTicketTarget: 400,
    customGoals: DEFAULT_CUSTOM_GOALS,
};

export function usePersonalGoals(email?: string | null) {
    const storageKey = `personal_goals_v2_${email || 'default'}`;

    const read = (): PersonalGoals => {
        if (typeof window === 'undefined') return DEFAULTS;
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return DEFAULTS;
            const parsed = JSON.parse(raw);
            return {
                monthlyTicketTarget: parsed.monthlyTicketTarget ?? DEFAULTS.monthlyTicketTarget,
                customGoals: parsed.customGoals ?? DEFAULTS.customGoals,
            };
        } catch {
            return DEFAULTS;
        }
    };

    const [goals, setGoalsState] = useState<PersonalGoals>(DEFAULTS);

    useEffect(() => {
        setGoalsState(read());
    }, [email]);

    const setGoals = useCallback((updated: Partial<PersonalGoals>) => {
        setGoalsState(prev => {
            const next = { ...prev, ...updated };
            try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }, [storageKey]);

    const updateCustomGoal = useCallback((id: string, patch: Partial<CustomGoal>) => {
        setGoalsState(prev => {
            const next = {
                ...prev,
                customGoals: prev.customGoals.map(g => g.id === id ? { ...g, ...patch } : g),
            };
            try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* ignore */ }
            return next;
        });
    }, [storageKey]);

    return { goals, setGoals, updateCustomGoal };
}
