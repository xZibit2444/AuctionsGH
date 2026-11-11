import { describe, expect, it } from 'vitest';
import { normalizeGhanaPhone, isPhoneGateExempt, safeNextPath } from '@/lib/phone';

describe('phone requirement helpers', () => {
    it('normalises Ghana numbers', () => {
        expect(normalizeGhanaPhone('0201234567')).toBe('+233201234567');
        expect(normalizeGhanaPhone('+233 20 123 4567')).toBe('+233201234567');
        expect(normalizeGhanaPhone('233201234567')).toBe('+233201234567');
    });
    it('rejects invalid numbers', () => {
        expect(normalizeGhanaPhone('')).toBeNull();
        expect(normalizeGhanaPhone('+233')).toBeNull();
        expect(normalizeGhanaPhone('12345')).toBeNull();
    });
    it('exempts auth and legal routes only', () => {
        expect(isPhoneGateExempt('/complete-profile')).toBe(true);
        expect(isPhoneGateExempt('/callback')).toBe(true);
        expect(isPhoneGateExempt('/api/auth/signup')).toBe(true);
        expect(isPhoneGateExempt('/dashboard')).toBe(false);
        expect(isPhoneGateExempt('/')).toBe(false);
    });
    it('blocks open redirects', () => {
        expect(safeNextPath('//evil.com')).toBe('/');
        expect(safeNextPath('https://evil.com')).toBe('/');
        expect(safeNextPath('/complete-profile')).toBe('/');
        expect(safeNextPath('/dashboard')).toBe('/dashboard');
        expect(safeNextPath(null)).toBe('/');
    });
});
