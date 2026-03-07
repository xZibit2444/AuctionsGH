'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

function getAdminClient() {
    return createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );
}

export interface SellerApplicationData {
    full_name: string;
    phone_number: string;
    location: string;
    items_to_sell: string;
    experience: string;
}

export async function submitSellerApplication(data: SellerApplicationData) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    // Validate required fields
    const required: (keyof SellerApplicationData)[] = [
        'full_name', 'phone_number', 'location', 'items_to_sell', 'experience',
    ];
    for (const field of required) {
        if (!data[field]?.trim()) return { success: false, error: 'All fields are required.' };
    }

    // Check for existing non-rejected application
    const { data: existing } = await supabase
        .from('seller_applications')
        .select('id, status')
        .eq('user_id', user.id)
        .in('status', ['pending', 'approved'])
        .maybeSingle() as { data: { id: string; status: string } | null; error: unknown };

    if (existing) {
        if (existing.status === 'approved') {
            return { success: false, error: 'Your account is already approved as a seller.' };
        }
        return { success: false, error: 'You already have a pending application under review.' };
    }

    const admin = getAdminClient();
    const { error } = await admin.from('seller_applications').insert({
        user_id: user.id,
        ...data,
    });

    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function reviewSellerApplication(
    applicationId: string,
    action: 'approved' | 'rejected',
    adminNotes?: string
) {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const { data: callerProfile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single() as { data: { is_super_admin: boolean } | null; error: unknown };

    if (!callerProfile?.is_super_admin) return { success: false, error: 'Forbidden' };

    const admin = getAdminClient();

    const { data: application, error: fetchErr } = await admin
        .from('seller_applications')
        .select('user_id')
        .eq('id', applicationId)
        .single();

    if (fetchErr || !application) return { success: false, error: 'Application not found' };

    const { error } = await admin
        .from('seller_applications')
        .update({
            status: action,
            admin_notes: adminNotes?.trim() || null,
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

    if (error) return { success: false, error: error.message };

    if (action === 'approved') {
        const { error: profileErr } = await admin
            .from('profiles')
            .update({ is_admin: true, is_verified: true, updated_at: new Date().toISOString() })
            .eq('id', application.user_id);
        if (profileErr) return { success: false, error: profileErr.message };
    }

    return { success: true };
}
