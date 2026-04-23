export type HomeStackParams = {
    Home: undefined;
    AuctionDetail: { auctionId: string };
    OfferChat: {
        auctionId: string; auctionTitle: string;
        sellerId: string; buyerId: string;
        offerId: string; offerStatus: 'pending' | 'accepted' | 'declined';
    };
};

export type ProfileStackParams = {
    Profile: undefined;
    Orders: undefined;
    OrderDetail: { orderId: string };
    Saved: undefined;
    Settings: undefined;
    SellerApply: undefined;
};

export type DashboardStackParams = {
    Dashboard: undefined;
    CreateAuction: undefined;
    Checkout: { auctionId: string };
    Orders: undefined;
    OrderDetail: { orderId: string };
};

export type TabParams = {
    HomeTab: undefined;
    DashboardTab: undefined;
    ProfileTab: undefined;
};
