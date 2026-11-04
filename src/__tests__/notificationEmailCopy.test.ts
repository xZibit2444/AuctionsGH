import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendNotificationEmail = vi.fn(async () => ({ success: true, data: { id: 'x' } }));
vi.mock('@/lib/email/sender', () => ({
    sendNotificationEmail: (...args: unknown[]) => sendNotificationEmail(...args),
}));

import { insertNotificationIfEnabled, emailNotificationCopy } from '@/lib/notifications';

function fakeClient(opts: {
    prefs?: object | null;
    email?: string | null;
    failInsert?: boolean;
}) {
    const inserts: Array<Record<string, unknown>> = [];
    const client = {
        auth: {
            admin: {
                getUserById: async () => ({ data: { user: opts.email ? { email: opts.email } : null } }),
            },
        },
        from: (table: string) => {
            if (table === 'profiles') {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({
                                data: opts.prefs === undefined
                                    ? { full_name: 'Ama', username: 'ama' }
                                    : { notification_preferences: opts.prefs, full_name: 'Ama', username: 'ama' },
                                error: null,
                            }),
                        }),
                    }),
                };
            }
            if (table === 'device_push_tokens') {
                return { select: () => ({ eq: async () => ({ data: [] }) }) };
            }
            return {
                insert: async (row: Record<string, unknown>) => {
                    inserts.push(row);
                    return { error: opts.failInsert ? { message: 'permission denied' } : null };
                },
            };
        },
    };
    return { client, inserts };
}

const flush = () => vi.waitFor(() => expect(sendNotificationEmail).toHaveBeenCalled());

describe('insertNotificationIfEnabled generic email copy', () => {
    beforeEach(() => sendNotificationEmail.mockClear());

    it('emails a copy of an inserted notification with an order link', async () => {
        const { client } = fakeClient({ email: 'ama@example.com' });
        await insertNotificationIfEnabled(client as never, {
            user_id: 'u1',
            type: 'system',
            title: 'Order cancelled by buyer',
            body: 'The order was cancelled.',
            order_id: 'o1',
        });
        await flush();
        const [to, name, title, body, url] = sendNotificationEmail.mock.calls[0];
        expect(to).toBe('ama@example.com');
        expect(name).toBe('Ama');
        expect(title).toBe('Order cancelled by buyer');
        expect(body).toBe('The order was cancelled.');
        expect(url).toContain('/orders/o1');
    });

    it('links to the auction when only an auction id is present', async () => {
        const { client } = fakeClient({ email: 'ama@example.com' });
        await insertNotificationIfEnabled(client as never, {
            user_id: 'u1',
            type: 'new_bid',
            title: 'New bid on your listing',
            auction_id: 'a1',
        });
        await flush();
        expect(sendNotificationEmail.mock.calls[0][4]).toContain('/auctions/a1');
    });

    it('does not email when the call site marks a dedicated email (skipEmail)', async () => {
        const { client } = fakeClient({ email: 'ama@example.com' });
        await insertNotificationIfEnabled(client as never, {
            user_id: 'u1',
            type: 'new_offer',
            title: 'New Offer on Your Listing',
            auction_id: 'a1',
            skipEmail: true,
        });
        await new Promise((r) => setTimeout(r, 20));
        expect(sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('does not email new_message notifications (richer message email handles them)', async () => {
        const { client } = fakeClient({ email: 'ama@example.com' });
        await insertNotificationIfEnabled(client as never, {
            user_id: 'u1',
            type: 'new_message',
            title: 'New message',
            order_id: 'o1',
        });
        await new Promise((r) => setTimeout(r, 20));
        expect(sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('does not email when the notification preference is off (nothing inserted)', async () => {
        const { client, inserts } = fakeClient({ prefs: { new_bid: false }, email: 'ama@example.com' });
        const r = await insertNotificationIfEnabled(client as never, {
            user_id: 'u1',
            type: 'new_bid',
            title: 'New bid on your listing',
            auction_id: 'a1',
        });
        await new Promise((r2) => setTimeout(r2, 20));
        expect(r.skipped).toBe(true);
        expect(inserts.length).toBe(0);
        expect(sendNotificationEmail).not.toHaveBeenCalled();
    });

    it('does not email when the insert fails', async () => {
        const { client } = fakeClient({ email: 'ama@example.com', failInsert: true });
        await insertNotificationIfEnabled(client as never, {
            user_id: 'u1',
            type: 'system',
            title: 'X',
        });
        await new Promise((r) => setTimeout(r, 20));
        expect(sendNotificationEmail).not.toHaveBeenCalled();
    });
});

describe('emailNotificationCopy', () => {
    beforeEach(() => sendNotificationEmail.mockClear());

    it('skips silently when the recipient has no email on record', async () => {
        const { client } = fakeClient({ email: null });
        await emailNotificationCopy(client as never, { user_id: 'u1', type: 'system', title: 'X' });
        expect(sendNotificationEmail).not.toHaveBeenCalled();
    });
});
