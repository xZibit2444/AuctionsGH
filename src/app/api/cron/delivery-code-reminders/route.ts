import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAuthorizedCronRequest } from '@/lib/cronAuth';
import { insertNotificationIfEnabled } from '@/lib/notifications';

const REMINDER_INTERVAL_MS = 3 * 60 * 60 * 1000;

type DeliveryReminderRow = {
    id: string;
    order_id: string;
    seller_id: string;
    sent_at: string | null;
    seller_code_reminder_last_sent_at: string | null;
    auction: { title: string | null } | null;
};

export async function GET(request: Request) {
    const auth = isAuthorizedCronRequest(request);
    if (!auth.ok) {
        if (auth.status === 500) {
            console.error('[delivery-code-reminders] %s', auth.error);
        }
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const supabase = createAdminClient();
    const cutoffIso = new Date(Date.now() - REMINDER_INTERVAL_MS).toISOString();

    const { data, error } = await supabase
        .from('deliveries')
        .select(`
            id,
            order_id,
            seller_id,
            sent_at,
            seller_code_reminder_last_sent_at,
            auction:auctions(title)
        `)
        .eq('status', 'sent')
        .not('sent_at', 'is', null)
        .lte('sent_at', cutoffIso)
        .or(`seller_code_reminder_last_sent_at.is.null,seller_code_reminder_last_sent_at.lte.${cutoffIso}`);

    if (error) {
        console.error('[delivery-code-reminders]', error.message);
        return NextResponse.json({ error: 'Internal error' }, { status: 500 });
    }

    const deliveries = (data ?? []) as DeliveryReminderRow[];
    if (deliveries.length === 0) {
        return NextResponse.json({ ok: true, reminded: 0, timestamp: new Date().toISOString() });
    }

    const nowIso = new Date().toISOString();
    let reminded = 0;

    for (const delivery of deliveries) {
        const title = delivery.auction?.title?.trim() || 'your sold item';

        const { error: notificationError } = await insertNotificationIfEnabled(supabase as never, {
            user_id: delivery.seller_id,
            type: 'system',
            title: 'Reminder: enter the buyer delivery code',
            body: `The order for "${title}" is still waiting for your buyer code confirmation. Open the order and enter the buyer's 6-digit code if handover is complete.`,
            order_id: delivery.order_id,
        });

        if (notificationError) {
            console.error('[delivery-code-reminders] notification failed for order %s: %s', delivery.order_id, notificationError.message);
            continue;
        }

        const { error: updateError } = await supabase
            .from('deliveries')
            .update({ seller_code_reminder_last_sent_at: nowIso } as never)
            .eq('id', delivery.id)
            .eq('status', 'sent');

        if (updateError) {
            console.error('[delivery-code-reminders] update failed for delivery %s: %s', delivery.id, updateError.message);
            continue;
        }

        reminded += 1;
    }

    return NextResponse.json({ ok: true, reminded, timestamp: nowIso });
}
