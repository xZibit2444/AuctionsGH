import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type AdminProfile = {
    is_admin?: boolean | null;
    is_super_admin?: boolean | null;
};

type NewsUpdate = {
    title: string;
    content: string;
    is_published: boolean;
};

export async function GET() {
    const supabase = await createClient();

    // Database types in this repo lag behind the live schema for news_updates.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('news_updates') as any)
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Database types in this repo lag behind the live schema for profiles admin flags.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase
        .from('profiles')
        .select('is_admin, is_super_admin')
        .eq('id', user.id)
        .single() as any);

    const adminProfile = profile as AdminProfile | null;

    if (!adminProfile?.is_admin && !adminProfile?.is_super_admin) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, content, is_published } = await request.json();

    if (!title || !content) {
        return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    // Database types in this repo lag behind the live schema for news_updates.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('news_updates') as any)
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