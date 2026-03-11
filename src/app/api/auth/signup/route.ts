import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resolveServerSiteUrl } from '@/lib/authRedirect';
import { sendSignupVerificationEmail } from '@/lib/email/sender';
import type { ProfileInsert } from '@/types/profile';
import { signupSchema } from '@/lib/validators';

type ProfilesUpsertQuery = {
    upsert: (values: ProfileInsert) => Promise<{ error: { message: string } | null }>;
};

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
        const normalizedUsername = username.trim().toLowerCase();

        const siteUrl = resolveServerSiteUrl(req.url);
        if (!siteUrl) {
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }
        const redirectTo = `${siteUrl}/login?verified=1`;

        const supabase = createAdminClient();

        const { data: existingUsernameProfile, error: usernameLookupError } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', normalizedUsername)
            .maybeSingle();

        if (usernameLookupError && usernameLookupError.code !== 'PGRST116') {
            return NextResponse.json({ error: 'Could not validate signup details.' }, { status: 500 });
        }

        if (existingUsernameProfile) {
            return NextResponse.json({ error: 'USERNAME_EXISTS' }, { status: 409 });
        }

        const { data: existingPhoneProfile, error: phoneLookupError } = await supabase
            .from('profiles')
            .select('id')
            .eq('phone_number', phone_number)
            .maybeSingle();

        if (phoneLookupError && phoneLookupError.code !== 'PGRST116') {
            return NextResponse.json({ error: 'Could not validate signup details.' }, { status: 500 });
        }

        if (existingPhoneProfile) {
            return NextResponse.json({ error: 'PHONE_EXISTS' }, { status: 409 });
        }

        const { data, error } = await supabase.auth.admin.generateLink({
            type: 'signup',
            email,
            password,
            options: {
                data: { username: normalizedUsername, full_name, phone_number, location },
                redirectTo,
            },
        });

        if (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('user already exists')) {
                return NextResponse.json({ error: 'EMAIL_EXISTS' }, { status: 409 });
            }
            if (msg.includes('profiles_username_key') || msg.includes('username')) {
                return NextResponse.json({ error: 'USERNAME_EXISTS' }, { status: 409 });
            }
            if (msg.includes('profiles_phone_number_key') || msg.includes('phone_number')) {
                return NextResponse.json({ error: 'PHONE_EXISTS' }, { status: 409 });
            }
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        if (!data.user || !data.properties?.action_link) {
            return NextResponse.json({ error: 'Signup failed. Please try again.' }, { status: 500 });
        }

        const profilesQuery = supabase.from('profiles') as unknown as ProfilesUpsertQuery;

        const { error: profileUpsertError } = await profilesQuery
            .upsert({
                id: data.user.id,
                username: normalizedUsername,
                full_name,
                phone_number,
                location,
            } satisfies ProfileInsert);

        if (profileUpsertError) {
            await supabase.auth.admin.deleteUser(data.user.id);
            return NextResponse.json(
                { error: 'Could not create your account profile. Please try again.' },
                { status: 500 }
            );
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
