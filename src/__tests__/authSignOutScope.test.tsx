// @vitest-environment jsdom
import React, { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as Record<string, unknown>).React = React;

const fx = vi.hoisted(() => ({
    signOut: vi.fn(),
    profile: { id: 'user-1', is_banned: false },
}));

vi.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: {
            signOut: fx.signOut,
            onAuthStateChange: (callback: (event: string, session: unknown) => void) => {
                callback('INITIAL_SESSION', { user: { id: 'user-1' } });
                return { data: { subscription: { unsubscribe: vi.fn() } } };
            },
        },
        from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: fx.profile, error: null }) }) }) }),
    }),
}));

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
let auth: ReturnType<typeof useAuth>;
function Consumer() {
    const value = useAuth();
    useEffect(() => { auth = value; }, [value]);
    return null;
}
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
    fx.signOut.mockReset().mockResolvedValue({ error: null });
    fx.profile = { id: 'user-1', is_banned: false };
    container = document.createElement('div');
    root = createRoot(container);
});
afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
});
async function mount() {
    await act(async () => root.render(<AuthProvider><Consumer /></AuthProvider>));
}

describe('sign-out scope', () => {
    it('ordinary sign-out explicitly revokes only this session and clears this UI', async () => {
        await mount();
        expect(auth.user?.id).toBe('user-1');
        await act(async () => auth.signOut());
        expect(fx.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
        expect(auth.user).toBeNull();
        expect(auth.profile).toBeNull();
    });

    it('ordinary sign-out leaves an independent device session active', async () => {
        const sessions = new Set(['mobile', 'desktop']);
        fx.signOut.mockImplementation(async ({ scope }: { scope?: string } = {}) => {
            if (scope === 'local') sessions.delete('mobile');
            else sessions.clear();
            return { error: null };
        });
        await mount();
        await act(async () => auth.signOut());
        expect([...sessions]).toEqual(['desktop']);
    });

    it('explicit Sign out all keeps global revocation', async () => {
        await mount();
        await act(async () => auth.signOutAll());
        expect(fx.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'global' });
        expect(auth.user).toBeNull();
    });

    it('banned-user security sign-out keeps its existing global default', async () => {
        fx.profile = { id: 'user-1', is_banned: true };
        await mount();
        expect(fx.signOut).toHaveBeenCalledExactlyOnceWith();
        expect(auth.user).toBeNull();
    });
});
