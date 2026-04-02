'use server';

import { finalizeAuction } from '@/lib/auctionFinalization';

export async function finalizeAuctionAction(auctionId: string) {
    return finalizeAuction(auctionId);
}
