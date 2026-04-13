
import { T1_TEAM_ID, T1_AFFILIATED_TEAMS } from '../tier-config';

// Mock filterByTeam logic from route.ts
const filterByTeam = (conversations: any[], teamId: string) => {
    if (!teamId) return conversations;

    const isT1Filter = teamId === T1_TEAM_ID;

    const filtered = conversations.filter((conv: any) => {
        if (conv.is_ticket) return true;

        if (isT1Filter) {
            const convTeam = conv.team_assignee_id ? Number(conv.team_assignee_id) : null;
            return convTeam !== null && T1_AFFILIATED_TEAMS.has(convTeam);
        }

        const targetTeamId = Number(teamId);
        return conv.team_assignee_id && Number(conv.team_assignee_id) === targetTeamId;
    });

    return filtered;
};

describe('Tier Isolation Logic', () => {
    const T1_TEAM_ID = 'T1';
    const T2_TEAM_ID = '7710348';
    const T3_TEAM_ID = '7712996';

    const mockConversations = [
        { id: 't1_conv', team_assignee_id: 7096884 }, // Tier 1 affiliated team
        { id: 't2_conv', team_assignee_id: 7710348 }, // Tier 2 exact match
        { id: 't3_conv', team_assignee_id: 7712996 }, // Tier 3 exact match
        { id: 'external_conv', team_assignee_id: 9999999 }, // Unaffiliated
    ];

    it('isolates Tier 1 correctly (only includes affiliated product teams)', () => {
        const filtered = filterByTeam(mockConversations, T1_TEAM_ID);
        expect(filtered.length).toBe(1);
        expect(filtered[0].id).toBe('t1_conv');
    });

    it('isolates Tier 2 correctly (exact match only)', () => {
        const filtered = filterByTeam(mockConversations, T2_TEAM_ID);
        expect(filtered.length).toBe(1);
        expect(filtered[0].id).toBe('t2_conv');
    });

    it('isolates Tier 3 correctly (exact match only)', () => {
        const filtered = filterByTeam(mockConversations, T3_TEAM_ID);
        expect(filtered.length).toBe(1);
        expect(filtered[0].id).toBe('t3_conv');
    });

    it('excludes T3 conversations from T1 and T2 views', () => {
        const t1Filtered = filterByTeam(mockConversations, T1_TEAM_ID);
        const t2Filtered = filterByTeam(mockConversations, T2_TEAM_ID);
        
        expect(t1Filtered.find(c => c.id === 't3_conv')).toBeUndefined();
        expect(t2Filtered.find(c => c.id === 't3_conv')).toBeUndefined();
    });
});
