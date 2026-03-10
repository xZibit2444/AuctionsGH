import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildServerAuthRedirectUrl } from '@/lib/authRedirect';
import { sendSignupVerificationEmail } from '@/lib/email/sender';
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

        const origin = buildServerAuthRedirectUrl('/login?verified=1', req.url);
        if (!origin) {
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        const supabase = createAdminClient();
        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'signup',
            email,
            password,
            options: {
                data: { username, full_name, phone_number, location },
                redirectTo: origin,
            },
        });

        if (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('user already exists')) {
                return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (!data.user || !data.properties?.action_link) {
            return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 });
        }

        const emailResult = await sendSignupVerificationEmail(
            email,
            full_name,
            data.properties.action_link
        );

        if (!emailResult.success) {
            await supabase.auth.admin.deleteUser(data.user.id);
            return NextResponse.json(
                { error: 'Could not send verification email. Please try again.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ success: true }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
    }
}
