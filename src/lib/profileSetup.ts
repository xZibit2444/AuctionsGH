import { isPhoneGateExempt } from './phone';

/**
 * Routes a signed-in user may visit before completing the one-time profile
 * setup step. Everything the phone gate exempts stays exempt here too, so the
 * two gates never compete for the same navigation.
 */
export function isProfileSetupGateExempt(pathname: string): boolean {
    return pathname === '/setup-profile' || pathname.startsWith('/setup-profile/') || isPhoneGateExempt(pathname);
}

const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;

/** Returns an error message when the username cannot be saved, else null. Same rules as signup. */
export function validateSetupUsername(value: string): string | null {
    const username = value.trim();
    if (username.length < 3) return 'Username must be at least 3 characters';
    if (username.length > 20) return 'Username must be at most 20 characters';
    if (!USERNAME_PATTERN.test(username)) return 'Username can only contain letters, numbers, and underscores';
    return null;
}
