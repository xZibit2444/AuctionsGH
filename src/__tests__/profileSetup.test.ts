import { describe, expect, it } from 'vitest';
import { isProfileSetupGateExempt, validateSetupUsername } from '@/lib/profileSetup';

describe('isProfileSetupGateExempt', () => {
    it('exempts the setup page itself so the gate never loops', () => {
        expect(isProfileSetupGateExempt('/setup-profile')).toBe(true);
        expect(isProfileSetupGateExempt('/setup-profile/extra')).toBe(true);
    });

    it('keeps every phone-gate exemption so the two gates never compete', () => {
        expect(isProfileSetupGateExempt('/complete-profile')).toBe(true);
        expect(isProfileSetupGateExempt('/login')).toBe(true);
        expect(isProfileSetupGateExempt('/signup')).toBe(true);
        expect(isProfileSetupGateExempt('/callback')).toBe(true);
        expect(isProfileSetupGateExempt('/verify-email')).toBe(true);
        expect(isProfileSetupGateExempt('/api/auth/signup')).toBe(true);
        expect(isProfileSetupGateExempt('/support')).toBe(true);
    });

    it('gates ordinary app pages', () => {
        expect(isProfileSetupGateExempt('/')).toBe(false);
        expect(isProfileSetupGateExempt('/auctions')).toBe(false);
        expect(isProfileSetupGateExempt('/settings')).toBe(false);
        expect(isProfileSetupGateExempt('/profile')).toBe(false);
    });
});

describe('validateSetupUsername', () => {
    it('accepts valid usernames and trims whitespace', () => {
        expect(validateSetupUsername('kwamemensah')).toBeNull();
        expect(validateSetupUsername('kwame_99')).toBeNull();
        expect(validateSetupUsername('  ama1  ')).toBeNull();
    });

    it('rejects usernames outside the signup length rules', () => {
        expect(validateSetupUsername('ab')).toBe('Username must be at least 3 characters');
        expect(validateSetupUsername('   ')).toBe('Username must be at least 3 characters');
        expect(validateSetupUsername('a'.repeat(21))).toBe('Username must be at most 20 characters');
    });

    it('rejects characters the signup regex disallows', () => {
        expect(validateSetupUsername('bad name')).toBe('Username can only contain letters, numbers, and underscores');
        expect(validateSetupUsername('kwame!')).toBe('Username can only contain letters, numbers, and underscores');
    });
});
