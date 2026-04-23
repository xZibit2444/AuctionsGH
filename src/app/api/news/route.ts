import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';



export async function GET() {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('news_updates')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

/**
 * POST /api/news
 *
 * Creates a new news update.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('is_admin, is_super_admin')
        .eq('id', user.id)
        .single();

    if (!profile?.is_admin && !profile?.is_super_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, content, is_published } = await request.json();

    if (!title || !content) {
        return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
        .from('news_updates')
        .insert({
            title,
            content,
            is_published: is_published ?? false,

        })

        .select()

        .single();



    if (error) {

        return NextResponse.json({ error: error.message }, { status: 500 });

    }



    return NextResponse.json(data, { status: 201 });

}