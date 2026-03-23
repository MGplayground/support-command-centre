import { Session } from "next-auth";

export const adminMap: Record<string, { name: string; avatar: string | null; email?: string }> = {
    '7706965': { name: 'Mauro (T2 UK)', avatar: null, email: 'mauro@clearer.io' },
    '8215044': { name: 'Jenson (T1 UK)', avatar: null, email: 'jenson@clearer.io' },
    '8853567': { name: 'Luke (T1 UK)', avatar: null },
    '8867005': { name: 'Ash (T1 UK)', avatar: null },
    '6500257': { name: 'Maddox (T1 UK)', avatar: null },
    '8424076': { name: 'Luna (T1 Vietnam)', avatar: null },
    '6722239': { name: 'Trilok (T1 America)', avatar: null },
    '6500282': { name: 'Daniel (T2 UK)', avatar: null },
    '5461719': { name: 'Leila (T1 America)', avatar: null },
    '3669480': { name: 'Moll (Team Leader UK)', avatar: null },
    '8219930': { name: 'Manvir (T2 UK)', avatar: null },
    '7365787': { name: 'Khalil (T2 UK)', avatar: null }
};

/**
 * Utility to extract the Intercom Admin ID from the active NextAuth session by checking emails.
 * Uses Mauro's email as the default if a match isn't found.
 */
export function getIntercomIdFromSession(session: Session | null): string {
    const userEmail = session?.user?.email?.toLowerCase();

    if (!userEmail) return "7706965";

    // Allow testing locally using standard gmail variants for the primary author
    if (userEmail.includes("mauro") || userEmail.includes("clearer")) {
        return "7706965";
    }

    // Try to find an exact hit in the admin map
    for (const [id, data] of Object.entries(adminMap)) {
        if (data.email?.toLowerCase() === userEmail) {
            return id;
        }
    }

    return "7706965"; // Default fallback
}
