import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { signupSchema } from '@/lib/validators';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const result = signupSchema.safeParse(body);
        if (!result.success) {
            return NextResponse.json(
                { error: 'Invalid input', issues: result.error.issues },
                { status: 400 }
            );
        }

        const { email, password, username, full_name, phone_number, location } = result.data;

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? '';

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username, full_name, phone_number, location },
                emailRedirectTo: `${origin}/callback`,
            },
        });

        if (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('user already exists')) {
                return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (!data.user) {
            return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 });
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
