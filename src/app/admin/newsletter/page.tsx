import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Mail, Newspaper } from 'lucide-react';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import AdminNewsletterClient from '@/components/admin/AdminNewsletterClient';

export interface NewsItem {
    id: string;
    title: string;
    content: string;
    created_at: string;
}

export default async function AdminNewsletterPage() {
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

    // Fetch subscriber count
    const { data: profiles, error: profilesError } = await admin
        .from('profiles')
        .select('email')
        .not('email', 'is', null) as { data: { email: string }[] | null; error: unknown };

    const subscriberCount = profiles?.filter((p) => p.email && p.email.includes('@')).length ?? 0;

    // Fetch published news items
    const { data: newsItems, error: newsError } = await admin
        .from('news_updates')
        .select('id, title, content, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(50) as { data: NewsItem[] | null; error: unknown };

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 text-[10px] font-black uppercase tracking-widest mb-3">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Superior Admin Only
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-black tracking-tight flex items-center gap-3">
                        <Mail className="h-7 w-7" />
                        Send Newsletter
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">
                        Select news items and send a newsletter to all {subscriberCount} subscribers.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Link href="/admin/news" className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition-colors">
                        <Newspaper className="h-4 w-4" />
                        Manage News
                    </Link>
                    <Link href="/admin/orders" className="inline-flex items-center px-4 py-2 border border-gray-200 text-sm font-semibold text-gray-700 hover:border-black hover:text-black transition-colors">
                        Orders
                    </Link>
                </div>
            </div>

            {newsError && (
                <div className="mb-6 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Failed to load news items.
                </div>
            )}

            <AdminNewsletterClient
                newsItems={newsItems ?? []}
                subscriberCount={subscriberCount}
            />
        </div>
    );
}
