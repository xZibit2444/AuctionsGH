import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendNewMessageEmail = vi.fn(async () => ({ success: true, data: { id: 'x' } }));
vi.mock('@/lib/email/sender', () => ({ sendNewMessageEmail: (...args: unknown[]) => sendNewMessageEmail(...args) }));

import { emailNewMessageIfEnabled } from '@/lib/messageEmails';

function fakeClient(opts: { prefs?: object | null; email?: string | null }) {
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
            throw new Error('unexpected table ' + table);
        },
    };
    return client;
}

const baseArgs = {
    recipientId: 'r1',
    senderId: 's1',
    auctionTitle: 'iPhone 16',
    messageBody: 'Is this still available?',
    chatUrl: 'https://auctionsgh.com/orders/o1',
};

describe('emailNewMessageIfEnabled', () => {
    beforeEach(() => sendNewMessageEmail.mockClear());

    it('emails the recipient when new_message preference is on', async () => {
        const r = await emailNewMessageIfEnabled(fakeClient({ prefs: { new_message: true }, email: 'ama@example.com' }) as never, baseArgs);
        expect(r.skipped).toBe(false);
        expect(sendNewMessageEmail).toHaveBeenCalledTimes(1);
        const [to, recipientName, , auctionTitle, preview, chatUrl] = sendNewMessageEmail.mock.calls[0];
        expect(to).toBe('ama@example.com');
        expect(recipientName).toBe('Ama');
        expect(auctionTitle).toBe('iPhone 16');
        expect(preview).toBe('Is this still available?');
        expect(chatUrl).toBe(baseArgs.chatUrl);
    });

    it('skips the email when new_message preference is off', async () => {
        const r = await emailNewMessageIfEnabled(fakeClient({ prefs: { new_message: false }, email: 'ama@example.com' }) as never, baseArgs);
        expect(r.skipped).toBe(true);
        expect(sendNewMessageEmail).not.toHaveBeenCalled();
    });

    it('sends by default when no preferences are stored', async () => {
        const r = await emailNewMessageIfEnabled(fakeClient({ email: 'ama@example.com' }) as never, baseArgs);
        expect(r.skipped).toBe(false);
        expect(sendNewMessageEmail).toHaveBeenCalledTimes(1);
    });

    it('skips when the recipient has no email on record', async () => {
        const r = await emailNewMessageIfEnabled(fakeClient({ prefs: { new_message: true }, email: null }) as never, baseArgs);
        expect(r.skipped).toBe(true);
        expect(sendNewMessageEmail).not.toHaveBeenCalled();
    });

    it('truncates long message previews', async () => {
        const long = 'x'.repeat(500);
        await emailNewMessageIfEnabled(fakeClient({ email: 'ama@example.com' }) as never, { ...baseArgs, messageBody: long });
        const preview = sendNewMessageEmail.mock.calls[0][4] as string;
        expect(preview.length).toBe(201);
    });
});
