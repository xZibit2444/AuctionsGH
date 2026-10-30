import { describe, it, expect, vi } from 'vitest';
import { insertNotificationIfEnabled } from '@/lib/notifications';

function fakeClient(rejectTypes: string[]) {
    const inserts: Array<Record<string, unknown>> = [];
    const client = {
        from: (table: string) => {
            if (table === 'profiles') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
            if (table === 'device_push_tokens') return { select: () => ({ eq: async () => ({ data: [] }) }) };
            return {
                insert: async (row: Record<string, unknown>) => {
                    inserts.push(row);
                    if (rejectTypes.includes(row.type as string)) {
                        return { error: { message: 'invalid input value for enum notification_type: "new_offer"' } };
                    }
                    return { error: null };
                },
            };
        },
    };
    return { client, inserts };
}

describe('insertNotificationIfEnabled enum fallback', () => {
    const n = { user_id: 'u', type: 'new_offer' as const, title: 'New Offer on Your Listing', auction_id: 'a' };
    it('inserts new_offer directly when the enum accepts it', async () => {
        const { client, inserts } = fakeClient([]);
        const r = await insertNotificationIfEnabled(client as never, n);
        expect(inserts.map((i) => i.type)).toEqual(['new_offer']);
        expect(r.error).toBeNull();
    });
    it('retries as system when the enum rejects new_offer', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { client, inserts } = fakeClient(['new_offer']);
        const r = await insertNotificationIfEnabled(client as never, n);
        expect(inserts.map((i) => i.type)).toEqual(['new_offer', 'system']);
        expect(r.error).toBeNull();
    });
    it('does not retry unrelated errors', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { client, inserts } = fakeClient([]);
        const bad = { ...client, from: (t: string) => t === 'notifications' ? { insert: async (row: Record<string, unknown>) => { inserts.push(row); return { error: { message: 'permission denied' } }; } } : client.from(t) };
        await insertNotificationIfEnabled(bad as never, n);
        expect(inserts.length).toBe(1);
    });

    it('skips new_message when the user explicitly turned it off', async () => {
        const { inserts, client } = fakeClient([]);
        const off = {
            ...client,
            from: (t: string) => t === 'profiles'
                ? { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { notification_preferences: { new_message: false } }, error: null }) }) }) }
                : client.from(t),
        };
        const m = { user_id: 'u', type: 'new_message' as const, title: 'New message from Buyer', order_id: 'o' };
        const r = await insertNotificationIfEnabled(off as never, m);
        expect(r.skipped).toBe(true);
        expect(inserts.length).toBe(0);
    });
});
