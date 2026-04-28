'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient as _createAdminClient } from '@/lib/supabase/admin';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createAdminClient = () => _createAdminClient() as any;

async function requireSuperAdmin() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const admin = createAdminClient();
    const { data: profile } = await admin
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single() as { data: { is_super_admin: boolean } | null; error: unknown };
    return profile?.is_super_admin ? user : null;
}

export async function adminUnpublishAuction(
    auctionId: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    const user = await requireSuperAdmin();
    if (!user) return { success: false, error: 'Access denied' };

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin
        .from('auctions')
        .update({ status: 'cancelled', updated_at: now })
        .eq('id', auctionId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function adminForceEndAuction(
    auctionId: string
): Promise<{ success: boolean; error?: string }> {
    const user = await requireSuperAdmin();
    if (!user) return { success: false, error: 'Access denied' };

    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin
        .from('auctions')
        .update({ status: 'ended', ends_at: now, updated_at: now })
        .eq('id', auctionId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function adminExtendAuction(
    auctionId: string,
    hoursToAdd: number
): Promise<{ success: boolean; error?: string }> {
    const user = await requireSuperAdmin();
    if (!user) return { success: false, error: 'Access denied' };

    const admin = createAdminClient();
    const { data: auction } = await admin
        .from('auctions')
        .select('ends_at')
        .eq('id', auctionId)
        .single() as { data: { ends_at: string } | null; error: unknown };

    if (!auction) return { success: false, error: 'Auction not found' };

    const currentEnd = new Date(auction.ends_at);
    const newEnd = new Date(currentEnd.getTime() + hoursToAdd * 60 * 60 * 1000);
    const now = new Date().toISOString();

    const { error } = await admin
        .from('auctions')
        .update({ ends_at: newEnd.toISOString(), updated_at: now })
        .eq('id', auctionId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function adminEditAuctionTitle(
    auctionId: string,
    title: string
): Promise<{ success: boolean; error?: string }> {
    const user = await requireSuperAdmin();
    if (!user) return { success: false, error: 'Access denied' };

    const trimmed = title.trim();
    if (!trimmed) return { success: false, error: 'Title cannot be empty' };

    const admin = createAdminClient();
    const { error } = await admin
        .from('auctions')
        .update({ title: trimmed, updated_at: new Date().toISOString() })
        .eq('id', auctionId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function adminReactivateAuction(
    auctionId: string,
    extendHours = 24
): Promise<{ success: boolean; error?: string }> {
    const user = await requireSuperAdmin();
    if (!user) return { success: false, error: 'Access denied' };

    const admin = createAdminClient();
    const newEnd = new Date(Date.now() + extendHours * 60 * 60 * 1000).toISOString();
    const { error } = await admin
        .from('auctions')
        .update({ status: 'active', ends_at: newEnd, updated_at: new Date().toISOString() })
        .eq('id', auctionId);

    if (error) return { success: false, error: error.message };
    return { success: true };
}
