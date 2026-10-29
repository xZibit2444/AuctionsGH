import { redirect } from 'next/navigation';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminSupportClient, { type SupportRow } from '@/components/admin/AdminSupportClient';

export const dynamic = 'force-dynamic';

export default async function AdminSupportPage() {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect('/login');

    const admin = createAdminClient();
    const { data: profile } = await admin
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single() as { data: { is_super_admin: boolean } | null; error: unknown };
    if (!profile?.is_super_admin) redirect('/');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
        .from('support_requests')
        .select('id, created_at, name, email, topic, message, status')
        .order('created_at', { ascending: false })
        .limit(200) as { data: SupportRow[] | null };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10">
            <h1 className="text-2xl font-black text-black">Support requests</h1>
            <p className="text-sm text-gray-500 mt-1 mb-6">Sent from the Contact Support page. Only super admins can see this.</p>
            <AdminSupportClient initial={data ?? []} />
        </div>
    );
}
