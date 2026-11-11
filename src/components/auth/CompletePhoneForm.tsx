'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeGhanaPhone, safeNextPath } from '@/lib/phone';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

export default function CompletePhoneForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();
    const [phone, setPhone] = useState('+233');
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const next = safeNextPath(searchParams.get('next'));

    useEffect(() => {
        if (!loading && !user) router.replace('/login');
    }, [loading, user, router]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user) return;
        const normalized = normalizeGhanaPhone(phone);
        if (!normalized) {
            setError('Please enter a valid Ghana phone number, e.g. 0201234567.');
            return;
        }
        setSaving(true);
        setError(null);
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase.from('profiles') as any)
            .update({ phone_number: normalized })
            .eq('id', user.id);
        if (updateError) {
            const msg = (updateError as { message?: string; code?: string }).message ?? '';
            const code = (updateError as { code?: string }).code;
            setError(
                code === '23505' || /phone/i.test(msg)
                    ? 'That phone number is already in use by another account.'
                    : 'Could not save your number. Please try again.'
            );
            setSaving(false);
            return;
        }
        // Full reload so the auth context re-reads the profile with the new number.
        window.location.assign(next);
    };

    return (
        <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
                id="phone_number"
                label="Phone Number"
                type="tel"
                placeholder="0201234567 or +233201234567"
                value={phone}
                onChange={(event) => { setPhone(event.target.value); setError(null); }}
                error={error ?? undefined}
                autoComplete="tel"
                required
            />
            <Button type="submit" disabled={saving || !user} className="w-full">
                {saving ? 'Saving...' : 'Continue'}
            </Button>
        </form>
    );
}
