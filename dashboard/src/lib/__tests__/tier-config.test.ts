import { getTierConfig, getTierColor } from '../tier-config';

describe('getTierConfig', () => {
    it('returns correct config for T1', () => {
        const config = getTierConfig('T1');
        expect(config.id).toBe('T1');
        expect(config.name).toBe('Tier 1 Support');
        expect(config.teamId).toBe('7096884');
    });

    it('returns correct config for T2', () => {
        const config = getTierConfig('T2');
        expect(config.teamId).toBe('7710348');
    });

    it('returns correct config for T3', () => {
        const config = getTierConfig('T3');
        expect(config.teamId).toBe('7712996');
    });

    it('returns empty teamId for ALL', () => {
        const config = getTierConfig('ALL');
        expect(config.teamId).toBe('');
    });
});

describe('getTierColor', () => {
    it('returns blue for T1', () => {
        expect(getTierColor('T1')).toBe('text-blue-400');
    });

    it('returns purple for T2', () => {
        expect(getTierColor('T2')).toBe('text-purple-400');
    });

    it('returns cyan for T3', () => {
        expect(getTierColor('T3')).toBe('text-cyan-400');
    });

    it('returns slate for ALL', () => {
        expect(getTierColor('ALL')).toBe('text-slate-400');
    });
});
