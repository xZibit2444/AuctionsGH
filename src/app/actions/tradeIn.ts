'use server';

import { createClient as createServerClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { insertNotificationIfEnabled } from '@/lib/notifications';

interface SendTradeInMessageInput {
    auctionId?: string;
    threadId?: string;
    offeredItem?: string;
    body: string;
}

type TradeThreadRow = {
    id: string;
    auction_id: string;
    buyer_id: string;
    seller_id: string;
    offered_item: string;
};

type AuctionTradeTarget = {
    id: string;
    title: string;
    seller_id: string;
    status: string;
};

export async function sendTradeInMessageAction(
    input: SendTradeInMessageInput
): Promise<{ success: boolean; error?: string; threadId?: string; messageId?: string }> {
    const supabase = await createServerClient();
    const admin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'You must be logged in to send a trade-in message.' };

    const body = input.body.trim();
    if (!body) return { success: false, error: 'Message cannot be empty.' };
    if (body.length > 2000) return { success: false, error: 'Message is too long (max 2000 characters).' };

    const now = new Date().toISOString();
    let thread: TradeThreadRow | null = null;
    if (input.threadId) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (admin.from('auction_trade_threads') as any)
            .select('id, auction_id, buyer_id, seller_id, offered_item, auction:auctions(title)')
            .eq('id', input.threadId)
            .maybeSingle();
        const existingThread = data as (TradeThreadRow & { auction?: { title?: string } | null }) | null;

        if (error || !existingThread) return { success: false, error: 'Trade conversation not found.' };
        if (existingThread.buyer_id !== user.id && existingThread.seller_id !== user.id) {
            return { success: false, error: 'Access denied.' };
        }

        thread = {
            id: existingThread.id,
            auction_id: existingThread.auction_id,
            buyer_id: existingThread.buyer_id,
            seller_id: existingThread.seller_id,
            offered_item: existingThread.offered_item,
        };
    } else {
        const offeredItem = input.offeredItem?.trim() ?? '';
        if (!input.auctionId) return { success: false, error: 'Missing auction.' };
        if (!offeredItem) return { success: false, error: 'Tell the seller what item you want to trade in.' };

        const { data: auctionRecord, error: auctionError } = await admin
            .from('auctions')
            .select('id, title, seller_id, status')
            .eq('id', input.auctionId)
            .maybeSingle();
        const auction = auctionRecord as AuctionTradeTarget | null;

        if (auctionError || !auction) return { success: false, error: 'Auction not found.' };
        if (auction.seller_id === user.id) return { success: false, error: 'You cannot send a trade-in message on your own listing.' };
        if (auction.status !== 'active') return { success: false, error: 'Trade-in messages are only available on active listings.' };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingThreadRecord } = await (admin.from('auction_trade_threads') as any)
            .select('id, auction_id, buyer_id, seller_id, offered_item')
            .eq('auction_id', input.auctionId)
            .eq('buyer_id', user.id)
            .maybeSingle();
        const existingThread = existingThreadRecord as TradeThreadRow | null;

        if (existingThread) {
            thread = existingThread;

            if (existingThread.offered_item !== offeredItem) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                await (admin.from('auction_trade_threads') as any)
                    .update({ offered_item: offeredItem, updated_at: now })
                    .eq('id', existingThread.id);
                thread.offered_item = offeredItem;
            }
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: createdThreadRecord, error: createError } = await (admin.from('auction_trade_threads') as any)
                .insert({
                    auction_id: auction.id,
                    buyer_id: user.id,
                    seller_id: auction.seller_id,
                    offered_item: offeredItem,
                    updated_at: now,
                })
                .select('id, auction_id, buyer_id, seller_id, offered_item')
                .single();
            const createdThread = createdThreadRecord as TradeThreadRow | null;

            if (createError || !createdThread) {
                return { success: false, error: createError?.message ?? 'Failed to start trade-in chat.' };
            }

            thread = createdThread;
        }
    }

    if (!thread) return { success: false, error: 'Trade conversation not found.' };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: message, error: messageError } = await (admin.from('auction_trade_messages') as any)
        .insert({
            thread_id: thread.id,
            sender_id: user.id,
            body,
        })
        .select('id')
        .single();

    if (messageError || !message) {
        return { success: false, error: messageError?.message ?? 'Failed to send trade-in message.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('auction_trade_threads') as any)
        .update({ updated_at: now })
        .eq('id', thread.id);

    const senderIsBuyer = user.id === thread.buyer_id;
    const recipientId = senderIsBuyer ? thread.seller_id : thread.buyer_id;

    await insertNotificationIfEnabled(admin, {
        user_id: recipientId,
        type: 'new_message',
        title: senderIsBuyer ? 'New trade-in inquiry' : 'Seller replied to your trade-in',
        body: senderIsBuyer
            ? `${thread.offered_item}: ${body.slice(0, 100)}${body.length > 100 ? '...' : ''}`
            : body.slice(0, 100) + (body.length > 100 ? '...' : ''),
        auction_id: thread.auction_id,
    });

    return { success: true, threadId: thread.id, messageId: message.id };
}
