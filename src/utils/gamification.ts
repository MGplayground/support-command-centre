// Gamification utilities for bonus tracking and streak detection

export interface TicketClose {
    timestamp: number;
    ticketKey: string;
}

export interface GamificationStats {
    ticketsClosed: number;
    bonusAmount: number;
    recentCloses: TicketClose[];
    isOnFire: boolean;
    streakCount: number;
}

const BONUS_PER_TICKET = 2.00;
const STREAK_THRESHOLD = 5;
const STREAK_TIME_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

export function calculateBonus(ticketsClosed: number): number {
    return ticketsClosed * BONUS_PER_TICKET;
}

export function detectStreak(recentCloses: TicketClose[]): { isOnFire: boolean; count: number } {
    const now = Date.now();
    const oneHourAgo = now - STREAK_TIME_WINDOW;

    // Count tickets closed within the last hour
    const recentCount = recentCloses.filter(
        close => close.timestamp > oneHourAgo
    ).length;

    return {
        isOnFire: recentCount >= STREAK_THRESHOLD,
        count: recentCount,
    };
}

export function addTicketClose(
    currentCloses: TicketClose[],
    ticketKey: string
): TicketClose[] {
    const newClose: TicketClose = {
        timestamp: Date.now(),
        ticketKey,
    };

    // Add new close and keep last 50 entries
    return [newClose, ...currentCloses].slice(0, 50);
}

export function getGamificationStats(recentCloses: TicketClose[]): GamificationStats {
    const streak = detectStreak(recentCloses);
    const ticketsClosed = recentCloses.length;
    const bonusAmount = calculateBonus(ticketsClosed);

    return {
        ticketsClosed,
        bonusAmount,
        recentCloses,
        isOnFire: streak.isOnFire,
        streakCount: streak.count,
    };
}
