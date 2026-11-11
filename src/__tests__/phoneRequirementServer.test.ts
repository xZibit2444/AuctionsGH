import { beforeEach, describe, expect, it, vi } from 'vitest';

const fx = vi.hoisted(() => ({ result: { data: { phone_number: '+233201234567' } as unknown, error: null as unknown } }));
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({ from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => fx.result }) }) }) }),
}));

beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://x';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'svc';
    fx.result = { data: { phone_number: '+233201234567' }, error: null };
});

describe('server-side phone requirement', () => {
    it('allows writes only when a number is on file', async () => {
        const { userMayWrite } = await import('@/lib/phoneRequirement');
        expect(await userMayWrite('u1')).toBe(true);
        fx.result = { data: { phone_number: null }, error: null };
        expect(await userMayWrite('u1')).toBe(false);
        fx.result = { data: { phone_number: '  ' }, error: null };
        expect(await userMayWrite('u1')).toBe(false);
    });
    it('fails closed for writes when the profile cannot be read, null for page gate', async () => {
        const { userMayWrite, hasPhoneNumber } = await import('@/lib/phoneRequirement');
        fx.result = { data: null, error: { message: 'boom' } };
        expect(await hasPhoneNumber('u1')).toBeNull();
        expect(await userMayWrite('u1')).toBe(false);
    });
});
