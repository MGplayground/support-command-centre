'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * A drop-in replacement for useState that persists the value to localStorage.
 * SSR-safe: returns defaultValue during server render, hydrates on mount.
 */
export function usePersistedState<T>(
    key: string,
    defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    // Always start with default to avoid SSR mismatch
    const [value, setValue] = useState<T>(defaultValue);
    const [hydrated, setHydrated] = useState(false);

    // Hydrate from localStorage on mount (client-side only)
    useEffect(() => {
        try {
            const stored = localStorage.getItem(key);
            if (stored !== null) {
                setValue(JSON.parse(stored));
            }
        } catch {
            // localStorage unavailable or corrupt — use default
        }
        setHydrated(true);
    }, [key]);

    // Persist to localStorage whenever value changes (after hydration)
    const setPersistedValue = useCallback(
        (newValue: T | ((prev: T) => T)) => {
            setValue((prev) => {
                const resolved = typeof newValue === 'function'
                    ? (newValue as (prev: T) => T)(prev)
                    : newValue;
                try {
                    localStorage.setItem(key, JSON.stringify(resolved));
                } catch {
                    // localStorage full or unavailable
                }
                return resolved;
            });
        },
        [key]
    );

    return [value, setPersistedValue];
}
