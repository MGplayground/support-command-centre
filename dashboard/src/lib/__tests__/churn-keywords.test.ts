import { isHighChurnRisk, HIGH_CHURN_KEYWORDS } from '../churn-keywords';

describe('isHighChurnRisk', () => {
    // Positive cases — should detect risk
    it('detects "cancel" as high churn risk', () => {
        expect(isHighChurnRisk('I want to cancel my subscription')).toBe(true);
    });

    it('detects "refund" as high churn risk', () => {
        expect(isHighChurnRisk('I need a refund immediately')).toBe(true);
    });

    it('detects "frustrated" as high churn risk', () => {
        expect(isHighChurnRisk('I am very frustrated with the service')).toBe(true);
    });

    it('detects "unacceptable" as high churn risk', () => {
        expect(isHighChurnRisk('This is completely unacceptable!')).toBe(true);
    });

    it('is case-insensitive for CANCEL', () => {
        expect(isHighChurnRisk('CANCEL THIS NOW')).toBe(true);
    });

    it('detects partial match "frustrat" inside "frustration"', () => {
        expect(isHighChurnRisk('This level of frustration is too much')).toBe(true);
    });

    // Negative cases — should NOT flag as risk
    it('returns false for a positive review', () => {
        expect(isHighChurnRisk('Great support, very happy!')).toBe(false);
    });

    it('returns false for a neutral statement', () => {
        expect(isHighChurnRisk('The widget is not displaying on my site')).toBe(false);
    });

    it('returns false for an empty string', () => {
        expect(isHighChurnRisk('')).toBe(false);
    });

    it('returns false for unrelated negative feedback', () => {
        expect(isHighChurnRisk('The response could be faster')).toBe(false);
    });
});

describe('HIGH_CHURN_KEYWORDS list', () => {
    it('includes all expected keywords', () => {
        expect(HIGH_CHURN_KEYWORDS).toContain('cancel');
        expect(HIGH_CHURN_KEYWORDS).toContain('refund');
        expect(HIGH_CHURN_KEYWORDS).toContain('frustrat');
        expect(HIGH_CHURN_KEYWORDS).toContain('unacceptable');
    });
});
