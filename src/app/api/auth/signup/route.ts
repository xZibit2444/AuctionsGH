import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
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

        const adminClient = createAdminClient();

        // Create user with email_confirm: true to skip confirmation email
        const { data, error } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
                username,
                full_name,
                phone_number,
                location,
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
