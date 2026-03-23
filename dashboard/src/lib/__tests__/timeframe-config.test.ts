import { getTimeframeConfig } from '../timeframe-config';

describe('getTimeframeConfig', () => {
    it('returns "This Week" config for current_week', () => {
        const config = getTimeframeConfig('current_week');
        expect(config.id).toBe('current_week');
        expect(config.name).toBe('This Week');
        expect(config.days).toBe(7);
    });

    it('returns correct days for past_7_days', () => {
        const config = getTimeframeConfig('past_7_days');
        expect(config.days).toBe(7);
    });

    it('returns correct days for past_30_days', () => {
        const config = getTimeframeConfig('past_30_days');
        expect(config.days).toBe(30);
    });

    it('returns correct days for past_60_days', () => {
        const config = getTimeframeConfig('past_60_days');
        expect(config.days).toBe(60);
    });

    it('returns correct days for past_90_days', () => {
        const config = getTimeframeConfig('past_90_days');
        expect(config.days).toBe(90);
    });

    it('falls back to current_week for an unknown key', () => {
        // @ts-expect-error — intentionally testing with invalid input
        const config = getTimeframeConfig('unknown_key');
        expect(config.id).toBe('current_week');
    });
});
