'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { createAuctionSchema } from '@/lib/validators';
import { specFieldsForCategory } from '@/lib/listingEdit';
import { userMayWrite, PHONE_REQUIRED_MESSAGE } from '@/lib/phoneRequirement';

function adminClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export type CreateListingPayload = {
    form: unknown; // validated here with createAuctionSchema
    specs: { storage: string; battery: string; sim: string; lock: string; faults: string };
    isPermanent: boolean;
    allowBuyNow: boolean;
};

function numOrNull(raw: string): number | null {
    if (raw === '') return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

// Listing creation runs server-side so the phone requirement cannot be skipped
// by calling Supabase directly from the browser.
export async function createListingAction(
    payload: CreateListingPayload
): Promise<{ success: boolean; error?: string; auctionId?: string }> {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };
    if (!(await userMayWrite(user.id))) return { success: false, error: PHONE_REQUIRED_MESSAGE };

    const parsed = createAuctionSchema.safeParse(payload.form);
    if (!parsed.success) {
        return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid listing details' };
    }
    const formData = parsed.data;
    const { specs, isPermanent, allowBuyNow } = payload;
    const specFields = specFieldsForCategory(formData.brand);

    let endsAt: string;
    if (isPermanent) {
        endsAt = new Date('2099-12-31T23:59:59Z').toISOString();
    } else {
        const totalHours = (formData.duration_hours || 0) + (formData.duration_minutes || 0) / 60;
        if (totalHours === 0) {
            return { success: false, error: 'Please set a duration or choose a permanent listing.' };
        }
        endsAt = new Date(Date.now() + totalHours * 60 * 60 * 1000).toISOString();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: auction, error: auctionError } = await (adminClient().from('auctions') as any)
        .insert({
            seller_id: user.id,
            title: formData.title,
            description: formData.description || null,
            brand: formData.brand,
            model: formData.model,
            storage_gb: specFields.storage ? (formData.storage_gb || numOrNull(specs.storage)) : null,
            battery_health: specFields.battery ? numOrNull(specs.battery) : null,
            sim_type: specFields.sim ? specs.sim || null : null,
            network_lock: specFields.lock ? specs.lock || null : null,
            faults: (specs.faults ?? '').trim() || null,
            condition: formData.condition,
            starting_price: formData.starting_price,
            current_price: formData.starting_price,
            min_increment: formData.min_increment,
            ends_at: endsAt,
            listing_city: formData.listing_city,
            meetup_area: formData.meetup_area,
            delivery_available: formData.delivery_available,
            inspection_available: formData.inspection_available,
            allow_buy_now: isPermanent ? allowBuyNow : true,
        })
        .select()
        .single();

    if (auctionError || !auction) {
        return { success: false, error: auctionError?.message ?? 'Failed to create auction' };
    }

    const auctionId = (auction as { id: string }).id;

    const winnerNote = (formData.winner_note ?? '').trim();
    if (winnerNote) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: noteError } = await (adminClient().from('auction_winner_notes') as any).insert({
            auction_id: auctionId,
            seller_id: user.id,
            note: winnerNote,
        });
        if (noteError) console.error('Failed to save winner-only note:', noteError.message);
    }

    return { success: true, auctionId };
}
