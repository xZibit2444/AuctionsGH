import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { LOGO_PNG_BASE64 } from '@/emails/logoData';
import ListingsNewsletterEmail, { type NewsletterListing } from '@/emails/ListingsNewsletterEmail';
import { greetingName, unsubscribeUrl } from '@/lib/newsletterToken';
import { withNewsletterUtm } from '@/lib/emailLinks';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com').replace(/\/+$/, '');
const FROM = process.env.NEWSLETTER_FROM || 'Jason T at AuctionsGH <noreply@auctionsgh.com>';
const IMG = 'https://bgzjkwwsjrdlsjvyosoa.supabase.co/storage/v1/object/public/auction-images/';

// Content approved by the owner on 2026-11-01 (listing set and wording).
const SUBJECT = 'New on AuctionsGH: phones, laptops, TVs and more';
const INTRO = '68 items are now live on AuctionsGH: phones, laptops, TVs, furniture and more, from sellers across Ghana. Here are six worth a look. Message the seller, agree a price, and collect or arrange delivery.';
const UTM_CAMPAIGN = 'listings_newsletter';
const LISTINGS: NewsletterListing[] = [
    { title: 'iPhone 15 Pro Max 256GB', detail: 'Good · Greater Accra', price: '₵7,300', url: `${SITE}/auctions/f96b67a1-eadf-43fa-a6f7-1588ced542b3`, image: `${IMG}fd42e50f-26b3-48a8-8be3-35ec78ba08e6/f96b67a1-eadf-43fa-a6f7-1588ced542b3/1793287551897.jpg` },
    { title: 'iPhone 14 Pro Max 128GB', detail: 'Greater Accra', price: '₵4,499', url: `${SITE}/auctions/b2551153-6d75-4b18-be78-c4f0724d3adc`, image: `${IMG}fd42e50f-26b3-48a8-8be3-35ec78ba08e6/b2551153-6d75-4b18-be78-c4f0724d3adc/1793451900393-nimemb.jpg` },
    { title: 'iPad (A16) 128GB WiFi Blue', detail: 'Good · Greater Accra', price: '₵3,900', url: `${SITE}/auctions/0718bef4-de91-415b-998b-7b18d762f8cd`, image: `${IMG}fd42e50f-26b3-48a8-8be3-35ec78ba08e6/0718bef4-de91-415b-998b-7b18d762f8cd/1793481343363-1xmvjc.jpg` },
    { title: 'HP EliteBook 830 G7, Core i5, 256GB SSD', detail: 'Ashanti', price: '₵4,000', url: `${SITE}/auctions/5689c538-9d3c-473f-a7d3-fe7615e13da1`, image: `${IMG}fd42e50f-26b3-48a8-8be3-35ec78ba08e6/5689c538-9d3c-473f-a7d3-fe7615e13da1/1793468628926-9mrzy0.jpg` },
    { title: 'Samsung 40" Full HD Smart TV', detail: 'Ashanti', price: '₵2,500', url: `${SITE}/auctions/163bcbc7-8edc-4391-83ca-089c5d3b7b62`, image: `${IMG}fd42e50f-26b3-48a8-8be3-35ec78ba08e6/163bcbc7-8edc-4391-83ca-089c5d3b7b62/1793468749443-7dp56z.jpg` },
    { title: 'Gray Velvet 3-in-1 Sofa Set', detail: 'Brand New · Greater Accra', price: '₵2,200', url: `${SITE}/auctions/0f2a556b-2c50-4f5f-bc01-74bfa3e8a311`, image: `${IMG}3e0fc167-b8e4-4f18-9463-b1400adb8ec6/0f2a556b-2c50-4f5f-bc01-74bfa3e8a311/1793372810707-5rppuf.jpg` },
];

type Recipient = { id: string; email: string; firstName: string };

async function loadRecipients(): Promise<Recipient[]> {
    const admin = createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any;
    const users: { id: string; email: string }[] = [];
    for (let page = 1; page <= 20; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) throw error;
        for (const u of data.users) {
            if (u.email && u.email_confirmed_at) users.push({ id: u.id, email: u.email });
        }
        if (data.users.length < 1000) break;
    }
    const { data: profiles, error } = await db.from('profiles').select('id, full_name, is_banned, notification_preferences');
    if (error) throw error;
    const byId = new Map<string, { full_name: string | null; is_banned: boolean | null; notification_preferences: { promotions?: boolean } | null }>(
        (profiles ?? []).map((p: { id: string }) => [p.id, p])
    );
    const out: Recipient[] = [];
    for (const u of users) {
        const p = byId.get(u.id);
        if (!p || p.is_banned) continue;
        // Only an explicit saved promotions=true is included; false, missing or null are excluded.
        if (p.notification_preferences?.promotions !== true) continue;
        out.push({ id: u.id, email: u.email, firstName: greetingName(p.full_name, u.email) });
    }
    return out;
}

// Super admin only. Defaults to a dry run that returns counts only. A real send needs NEWSLETTER_SEND_ENABLED=true,
// a postal address in NEWSLETTER_POSTAL_ADDRESS, and { "confirm": true } in the request body.
export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: me } = await (supabase as any).from('profiles').select('is_super_admin').eq('id', user.id).single();
    if (!me?.is_super_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const confirm = body?.confirm === true;
    const testTo: string | undefined = typeof body?.testTo === 'string' ? body.testTo : undefined;
    const address = (process.env.NEWSLETTER_POSTAL_ADDRESS || '').trim();

    let recipients = await loadRecipients();
    if (testTo) recipients = recipients.filter((r) => r.email.toLowerCase() === testTo.toLowerCase());
    const dryRun = !confirm || process.env.NEWSLETTER_SEND_ENABLED !== 'true';

    if (dryRun) {
        return NextResponse.json({ dryRun: true, recipients: recipients.length, withName: recipients.filter((r) => r.firstName).length, addressConfigured: Boolean(address), sendEnabled: process.env.NEWSLETTER_SEND_ENABLED === 'true', from: FROM, replyToConfigured: Boolean(process.env.NEWSLETTER_REPLY_TO), postalAddress: address || null, ...(body?.selfUnsubscribeLink === true ? { selfUnsubscribeLink: unsubscribeUrl(user.id, SITE) } : {}) });
    }
    if (!address) return NextResponse.json({ error: 'NEWSLETTER_POSTAL_ADDRESS is not set' }, { status: 400 });
    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ error: 'Email service not configured' }, { status: 503 });

    const resend = new Resend(key);
    const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    let sent = 0;
    const failed: number[] = [];
    for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        const unsub = unsubscribeUrl(r.id, SITE);
        const taggedListings = LISTINGS.map((l) => ({ ...l, url: withNewsletterUtm(l.url, UTM_CAMPAIGN) }));
        const props = { firstName: r.firstName, dateLabel, intro: INTRO, listings: taggedListings, listingsUrl: withNewsletterUtm(`${SITE}/listings`, UTM_CAMPAIGN), unsubscribeUrl: unsub, postalAddress: address };
        const html = await render(ListingsNewsletterEmail(props));
        const text = `${r.firstName ? `Hi ${r.firstName},` : 'Hi,'}\n\n${INTRO}\n\n${taggedListings.map((l) => `${l.title} - ${l.price} (${l.detail})\n${l.url}`).join('\n\n')}\n\nAll listings: ${withNewsletterUtm(`${SITE}/listings`, UTM_CAMPAIGN)}\n\nThanks,\nJason T\nAuctionsGH\n\n---\n${address}\nUnsubscribe: ${unsub}\n`;
        const { error } = await resend.emails.send({
            from: FROM,
            replyTo: process.env.NEWSLETTER_REPLY_TO || undefined,
            to: r.email,
            subject: SUBJECT,
            html,
            text,
            attachments: [{ filename: 'auctionsgh-logo.png', content: LOGO_PNG_BASE64, contentType: 'image/png', contentId: 'auctionsgh-logo' }],
            headers: { 'List-Unsubscribe': `<${unsub}>` },
        });
        if (error) failed.push(i + 1); else sent++;
        await new Promise((res) => setTimeout(res, 600)); // stay under the provider's per-second limit
    }
    return NextResponse.json({ dryRun: false, sent, failed: failed.length, total: recipients.length });
}
