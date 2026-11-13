import { describe, it, expect, vi, beforeEach } from 'vitest';

let currentUser: { id: string } | null = null;
let callerIsSuperAdmin = true;
let targetProfile: { id: string; is_banned: boolean; full_name: string | null } | null = null;
let targetError: { message: string } | null = null;
let failUpdate: { message: string } | null = null;
const updates: unknown[] = [];
const authEmails: Record<string, string | undefined> = {};

const sendBanNotificationEmail = vi.fn(async () => ({ success: true }));
const sendUnbanNotificationEmail = vi.fn(async () => ({ success: true }));

vi.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({ auth: { getUser: async () => ({ data: { user: currentUser } }) } }),
}));

vi.mock('@/lib/supabase/admin', () => ({
    createAdminClient: () => ({
        from: () => ({
            select: (columns: string) => ({
                eq: () => ({
                    maybeSingle: async () => columns.includes('is_super_admin')
                        ? { data: callerIsSuperAdmin ? { is_super_admin: true } : { is_super_admin: false }, error: null }
                        : { data: targetProfile, error: targetError },
                }),
            }),
            update: (values: unknown) => ({
                eq: async () => {
                    updates.push(values);
                    return { error: failUpdate };
                },
            }),
        }),
        auth: {
            admin: {
                getUserById: async (id: string) => ({ data: { user: { email: authEmails[id] } } }),
            },
        },
    }),
}));

vi.mock('@/lib/email/sender', () => ({
    sendBanNotificationEmail: (...args: unknown[]) => sendBanNotificationEmail(...args),
    sendUnbanNotificationEmail: (...args: unknown[]) => sendUnbanNotificationEmail(...args),
}));

import { unbanUserAction } from '@/app/actions/adminUsers';

beforeEach(() => {
    currentUser = { id: 'admin-1' };
    callerIsSuperAdmin = true;
    targetProfile = { id: 'u1', is_banned: true, full_name: 'Ama Mensah' };
    targetError = null;
    failUpdate = null;
    updates.length = 0;
    authEmails.u1 = 'ama@example.com';
    sendBanNotificationEmail.mockClear();
    sendUnbanNotificationEmail.mockClear();
});

describe('unbanUserAction', () => {
    it('clears the ban and emails the reinstated user', async () => {
        const r = await unbanUserAction('u1');
        expect(r).toEqual({ success: true });
        expect(updates[0]).toMatchObject({ is_banned: false, banned_at: null, banned_reason: null, banned_by: null });
        expect(sendUnbanNotificationEmail).toHaveBeenCalledWith('ama@example.com', 'Ama Mensah');
        expect(sendBanNotificationEmail).not.toHaveBeenCalled();
    });
    it('still unbans when the account has no email on record, without sending', async () => {
        authEmails.u1 = undefined;
        const r = await unbanUserAction('u1');
        expect(r).toEqual({ success: true });
        expect(sendUnbanNotificationEmail).not.toHaveBeenCalled();
    });
    it('does not email when the user is not banned', async () => {
        targetProfile = { id: 'u1', is_banned: false, full_name: 'Ama Mensah' };
        const r = await unbanUserAction('u1');
        expect(r.success).toBe(false);
        expect(updates).toHaveLength(0);
        expect(sendUnbanNotificationEmail).not.toHaveBeenCalled();
    });
    it('does not email when the update fails', async () => {
        failUpdate = { message: 'db down' };
        const r = await unbanUserAction('u1');
        expect(r).toEqual({ success: false, error: 'db down' });
        expect(sendUnbanNotificationEmail).not.toHaveBeenCalled();
    });
    it('rejects non super admins before touching the target', async () => {
        callerIsSuperAdmin = false;
        const r = await unbanUserAction('u1');
        expect(r).toEqual({ success: false, error: 'Forbidden' });
        expect(updates).toHaveLength(0);
        expect(sendUnbanNotificationEmail).not.toHaveBeenCalled();
    });
    it('rejects logged-out callers', async () => {
        currentUser = null;
        const r = await unbanUserAction('u1');
        expect(r).toEqual({ success: false, error: 'Not authenticated' });
        expect(sendUnbanNotificationEmail).not.toHaveBeenCalled();
    });
});
