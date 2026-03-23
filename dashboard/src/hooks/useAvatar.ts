'use client';
import { useState, useEffect, useCallback } from 'react';

// On-brand gradient avatar options (violet/indigo/blue palette)
export const AVATAR_OPTIONS = [
    { id: 'violet', gradient: 'from-violet-600 to-purple-700' },
    { id: 'indigo', gradient: 'from-indigo-500 to-blue-700' },
    { id: 'cyan', gradient: 'from-cyan-500 to-sky-700' },
    { id: 'emerald', gradient: 'from-emerald-500 to-teal-700' },
    { id: 'rose', gradient: 'from-rose-500 to-pink-700' },
    { id: 'amber', gradient: 'from-amber-500 to-orange-600' },
] as const;

export type AvatarId = typeof AVATAR_OPTIONS[number]['id'];

export function useAvatar(email?: string | null) {
    const key = `avatar_pref_${email || 'default'}`;

    const read = (): AvatarId => {
        if (typeof window === 'undefined') return 'violet';
        return (localStorage.getItem(key) as AvatarId) || 'violet';
    };

    const [avatarId, setAvatarIdState] = useState<AvatarId>('violet');

    useEffect(() => { setAvatarIdState(read()); }, [email]);

    const setAvatarId = useCallback((id: AvatarId) => {
        setAvatarIdState(id);
        try { localStorage.setItem(key, id); } catch { /* ignore */ }
    }, [key]);

    const gradient = AVATAR_OPTIONS.find(a => a.id === avatarId)?.gradient ?? AVATAR_OPTIONS[0].gradient;

    return { avatarId, gradient, setAvatarId };
}
