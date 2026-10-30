// @vitest-environment jsdom
/**
 * Controlled-fixture tests for the listing-page redesign and home hero.
 * Hooks and server actions are mocked; fixtures drive every
 * status/type/role combination so eligibility is verified locally
 * without touching live data.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// ---------- shared mutable fixtures (hoisted so mock factories can read) ----------
const fx = vi.hoisted(() => {
    const push = vi.fn();
    const state: {
        auction: Record<string, unknown> | null;
        user: { id: string } | null;
        profile: Record<string, unknown> | null;
        bids: unknown[];
    } = { auction: null, user: null, profile: null, bids: [] };
    return { state, push };
});

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: fx.push, replace: vi.fn(), prefetch: vi.fn() }),
    usePathname: () => '/auctions/a1',
}));

vi.mock('next/link', () => ({
    default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) =>
        React.createElement('a', { href, ...rest }, children),
}));

vi.mock('next/image', () => ({
    default: (props: Record<string, unknown>) => React.createElement('img', props),
}));

vi.mock('@/hooks/useAuth', () => ({
    useAuth: () => ({ user: fx.state.user, profile: fx.state.profile, loading: false }),
}));

vi.mock('@/hooks/useAuction', () => ({
    useAuction: () => ({ auction: fx.state.auction, loading: false, error: null, setAuction: vi.fn() }),
}));

vi.mock('@/hooks/useBids', () => ({
    useBids: () => ({ bids: fx.state.bids, setBids: vi.fn(), loading: false }),
}));

vi.mock('@/hooks/useRealtimeBids', () => ({ useRealtimeBids: () => {} }));

vi.mock('@/hooks/useSavedAuctions', () => ({
    useSavedAuctions: () => ({ savedIds: new Set<string>(), toggleSave: vi.fn(), loading: false }),
}));

vi.mock('@/contexts/FavoriteSellersContext', () => ({
    useFavoriteSellersContext: () => ({
        favoriteSellerIds: new Set<string>(),
        toggleFavoriteSeller: vi.fn(),
    }),
}));

// Generic chainable+thenable supabase stub: every query resolves empty.
vi.mock('@/lib/supabase/client', () => {
    const makeQuery = (): unknown => {
        const q: Record<string, unknown> = {};
        const self = new Proxy(q, {
            get(target, prop) {
                if (prop === 'then') {
                    return (res: (v: unknown) => unknown) =>
                        Promise.resolve({ data: [], error: null }).then(res);
                }
                if (!(prop in target)) {
                    target[prop as string] = () => self;
                }
                return target[prop as string];
            },
        });
        return self;
    };
    return {
        createClient: () => ({
            from: () => makeQuery(),
            channel: () => {
                const c: Record<string, unknown> = {};
                c.on = () => c;
                c.subscribe = () => c;
                return c;
            },
            removeChannel: () => {},
            auth: { getUser: async () => ({ data: { user: null }, error: null }) },
        }),
    };
});

vi.mock('@/app/actions/offer', () => ({ makeOfferAction: vi.fn(), respondToOfferAction: vi.fn() }));
vi.mock('@/app/actions/buyNow', () => ({ buyNowAction: vi.fn() }));
vi.mock('@/app/actions/finalizeAuction', () => ({ finalizeAuctionAction: vi.fn(async () => ({ success: true })) }));
vi.mock('@/app/actions/deleteAuction', () => ({ deleteAuctionAction: vi.fn(async () => ({ success: true })) }));
vi.mock('@/app/actions/relistAuction', () => ({ relistAuctionAction: vi.fn(async () => ({ success: true })) }));
vi.mock('@/app/actions/updateListing', () => ({ setListingStatusAction: vi.fn(async () => ({ success: true })) }));
vi.mock('@/app/actions/comments', () => ({ sendAuctionCommentAction: vi.fn() }));
vi.mock('@/app/actions/moderation', () => ({ deleteAuctionCommentAction: vi.fn() }));

import AuctionDetail from '@/components/auction/AuctionDetail';
import ListingGallery from '@/components/auction/ListingGallery';
import HomeHero from '@/components/auction/HomeHero';

// ---------- fixture builders ----------
const PERMANENT_ENDS = '2095-01-01T00:00:00Z';
const TIMED_ENDS = new Date(Date.now() + 48 * 3600 * 1000).toISOString();

function baseAuction(over: Record<string, unknown> = {}) {
    return {
        id: 'a1',
        title: 'iPhone 11 Pro Max',
        seller_id: 'seller-1',
        status: 'active',
        current_price: 2000,
        min_increment: 50,
        condition: 'used',
        brand: 'Phones & Tablets',
        model: 'iPhone 11 Pro Max',
        description: 'Very clean.',
        listing_city: 'Accra',
        meetup_area: 'Osu',
        delivery_available: true,
        bid_count: 0,
        winner_id: null,
        ends_at: PERMANENT_ENDS,
        allow_buy_now: true,
        auction_images: [
            { id: 'img1', url: 'https://cdn.example.com/1.jpg', position: 0 },
        ],
        listing_videos: [],
        orders: [],
        auction_offers: [],
        profiles: { id: 'seller-1', username: 'kofishop', full_name: 'Kofi Shop', avatar_url: null, location: 'Accra', is_verified: false },
        ...over,
    };
}

let container: HTMLDivElement;
let root: Root | null = null;

async function renderDetail() {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => {
        root!.render(React.createElement(AuctionDetail, { auctionId: 'a1' }));
    });
    return container;
}

function buttonTexts(el: HTMLElement) {
    return Array.from(el.querySelectorAll('button')).map((b) => b.textContent?.trim() ?? '');
}

function stickyBar(el: HTMLElement) {
    return el.querySelector('.fixed.bottom-0') as HTMLElement | null;
}

beforeEach(() => {
    fx.state.user = null;
    fx.state.profile = null;
    fx.state.bids = [];
    // jsdom lacks scroll APIs; stub them.
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.scrollTo = vi.fn() as unknown as typeof Element.prototype.scrollTo;
});

afterEach(async () => {
    if (root) {
        await act(async () => root!.unmount());
        root = null;
    }
    container?.remove();
    vi.useRealTimers();
    document.body.innerHTML = '';
});

// ---------- eligibility / view coverage ----------
describe('AuctionDetail eligibility by status, type and role', () => {
    it('permanent active listing, buyer: Buy now + Make an offer in panel and sticky bar', async () => {
        fx.state.auction = baseAuction();
        const el = await renderDetail();
        const texts = buttonTexts(el);
        expect(texts).toContain('Buy now');
        expect(texts).toContain('Make an offer');
        expect(texts).not.toContain('Place a bid');
        const bar = stickyBar(el);
        expect(bar).toBeTruthy();
        expect(bar!.textContent).toContain('Buy now');
        // Real OfferPanel anchors exist for the proxies
        expect(el.querySelector('#buy-now-button')).toBeTruthy();
        expect(el.querySelector('#offer-amount-input')).toBeTruthy();
        expect(el.querySelector('#offer-panel')).toBeTruthy();
    });

    it('enquiry-only permanent listing (buy now off): no Buy now anywhere, enquiry note shown', async () => {
        fx.state.auction = baseAuction({ allow_buy_now: false });
        const el = await renderDetail();
        expect(buttonTexts(el)).not.toContain('Buy now');
        expect(el.querySelector('#buy-now-button')).toBeFalsy();
        expect(el.textContent).toContain('Availability confirmed on enquiry');
        expect(buttonTexts(el)).toContain('Make an offer');
    });

    it('permanent listing with zero price: no Buy now even when buy-now enabled', async () => {
        fx.state.auction = baseAuction({ current_price: 0 });
        const el = await renderDetail();
        expect(buttonTexts(el)).not.toContain('Buy now');
    });

    it('timed active auction, buyer: Place a bid + bid form, no Buy now, countdown present', async () => {
        fx.state.auction = baseAuction({ ends_at: TIMED_ENDS, bid_count: 3 });
        const el = await renderDetail();
        const texts = buttonTexts(el);
        expect(texts).toContain('Place a bid');
        expect(texts).not.toContain('Buy now');
        expect(el.querySelector('#bid-form')).toBeTruthy();
        expect(stickyBar(el)!.textContent).toContain('Bid');
    });

    it('sold permanent listing, buyer: no purchase CTAs, no sticky bar', async () => {
        fx.state.auction = baseAuction({ status: 'sold', bid_count: 0 });
        const el = await renderDetail();
        const texts = buttonTexts(el);
        expect(texts).not.toContain('Buy now');
        expect(texts).not.toContain('Make an offer');
        expect(texts).not.toContain('Place a bid');
        expect(stickyBar(el)).toBeNull();
    });

    it('ended timed auction, buyer: no purchase CTAs, no sticky bar, no bid form', async () => {
        fx.state.auction = baseAuction({ status: 'ended', ends_at: TIMED_ENDS, bid_count: 2 });
        const el = await renderDetail();
        const texts = buttonTexts(el);
        expect(texts).not.toContain('Buy now');
        expect(texts).not.toContain('Make an offer');
        expect(texts).not.toContain('Place a bid');
        expect(stickyBar(el)).toBeNull();
        expect(el.querySelector('#bid-form')).toBeFalsy();
    });

    it('paused (draft) listing, buyer: no purchase CTAs, no sticky bar', async () => {
        fx.state.auction = baseAuction({ status: 'draft' });
        const el = await renderDetail();
        const texts = buttonTexts(el);
        expect(texts).not.toContain('Buy now');
        expect(texts).not.toContain('Make an offer');
        expect(stickyBar(el)).toBeNull();
    });

    it('owner view: Manage card with edit + status controls, no buyer CTAs or sticky bar, no buy-now anchor', async () => {
        fx.state.user = { id: 'seller-1' };
        fx.state.profile = { id: 'seller-1', is_super_admin: false };
        fx.state.auction = baseAuction();
        const el = await renderDetail();
        expect(el.textContent).toContain('You listed this item');
        expect(el.textContent).toContain('Manage');
        expect(el.textContent).toContain('Edit listing');
        const texts = buttonTexts(el);
        expect(texts).not.toContain('Buy now');
        expect(texts).not.toContain('Place a bid');
        expect(stickyBar(el)).toBeNull();
        expect(el.querySelector('#buy-now-button')).toBeFalsy();
    });

    it('winner view (sold timed auction won by viewer): winner banner, no purchase CTAs', async () => {
        fx.state.user = { id: 'buyer-9' };
        fx.state.profile = { id: 'buyer-9', is_super_admin: false };
        fx.state.auction = baseAuction({
            status: 'sold',
            ends_at: TIMED_ENDS,
            bid_count: 5,
            winner_id: 'buyer-9',
            orders: [],
            auction_offers: [],
        });
        fx.state.bids = [{ bidder_id: 'buyer-9', amount: 2000, created_at: new Date().toISOString(), profiles: null }];
        const el = await renderDetail();
        expect(el.textContent).toContain('Congratulations, you won!');
        expect(el.textContent).toContain('Confirm Order');
        const texts = buttonTexts(el);
        expect(texts).not.toContain('Buy now');
        expect(stickyBar(el)).toBeNull();
    });
});

// ---------- proxy wiring ----------
describe('sticky-bar proxies reach the real OfferPanel controls', () => {
    it('Make an offer scrolls to #offer-panel and focuses #offer-amount-input', async () => {
        vi.useFakeTimers();
        fx.state.auction = baseAuction();
        const el = await renderDetail();
        const bar = stickyBar(el)!;
        const offerBtn = Array.from(bar.querySelectorAll('button')).find((b) =>
            b.textContent?.includes('Make an offer'),
        )!;
        await act(async () => {
            offerBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        const panel = el.querySelector('#offer-panel')!;
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
        await act(async () => {
            vi.advanceTimersByTime(500);
        });
        expect(document.activeElement?.id).toBe('offer-amount-input');
        expect(panel).toBeTruthy();
    });

    it('Buy now proxy dispatches a real click on #buy-now-button (no duplicate transaction path)', async () => {
        fx.state.auction = baseAuction();
        const el = await renderDetail();
        const real = el.querySelector('#buy-now-button') as HTMLElement;
        const received = vi.fn();
        real.addEventListener('click', received);
        const bar = stickyBar(el)!;
        const proxyBtn = Array.from(bar.querySelectorAll('button')).find((b) =>
            b.textContent?.trim() === 'Buy now',
        )!;
        await act(async () => {
            proxyBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        expect(received).toHaveBeenCalledTimes(1);
    });

    it('hidden real Buy now: signed-in click opens the confirm dialog and makes no purchase', async () => {
        fx.state.auction = baseAuction();
        fx.state.user = { id: 'buyer-1' };
        fx.state.profile = { id: 'buyer-1', is_super_admin: false };
        const { buyNowAction } = await import('@/app/actions/buyNow');
        const el = await renderDetail();
        const real = el.querySelector('#buy-now-button') as HTMLElement;
        expect(real).toBeTruthy();
        await act(async () => { real.click(); });
        expect(document.body.textContent).toContain('Buy this item?');
        expect(buyNowAction).not.toHaveBeenCalled();
    });

    it('hidden real Buy now: logged-out click redirects to login with no purchase', async () => {
        fx.state.auction = baseAuction();
        fx.state.user = null;
        fx.state.profile = null;
        fx.push.mockClear();
        const { buyNowAction } = await import('@/app/actions/buyNow');
        const el = await renderDetail();
        await act(async () => { (el.querySelector('#buy-now-button') as HTMLElement).click(); });
        expect(fx.push).toHaveBeenCalledWith(expect.stringContaining('/login?redirectTo=/auctions/'));
        expect(document.body.textContent).not.toContain('Buy this item?');
        expect(buyNowAction).not.toHaveBeenCalled();
    });

    it('Place a bid proxy scrolls to #bid-form on timed auctions', async () => {
        fx.state.auction = baseAuction({ ends_at: TIMED_ENDS, bid_count: 1 });
        const el = await renderDetail();
        const bar = stickyBar(el)!;
        const bidBtn = Array.from(bar.querySelectorAll('button')).find((b) =>
            b.textContent?.trim() === 'Bid',
        )!;
        await act(async () => {
            bidBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    });
});

// ---------- gallery ----------
describe('ListingGallery multi-photo and video slides', () => {
    async function renderGallery(props: React.ComponentProps<typeof ListingGallery>) {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        await act(async () => {
            root!.render(React.createElement(ListingGallery, props));
        });
        return container;
    }

    it('renders one slide per photo with counter and arrows', async () => {
        const el = await renderGallery({
            auctionId: 'a1',
            title: 't',
            images: [
                { id: 'i1', url: 'https://cdn.example.com/1.jpg' },
                { id: 'i2', url: 'https://cdn.example.com/2.jpg' },
                { id: 'i3', url: 'https://cdn.example.com/3.jpg' },
            ],
            hasVideo: false,
        });
        const slides = el.querySelectorAll('.overflow-x-auto > div');
        expect(slides.length).toBe(3);
        expect(el.textContent).toContain('1 / 3');
        expect(el.querySelector('button[aria-label="Next photo"]')).toBeTruthy();
        expect(el.querySelector('button[aria-label="Previous photo"]')).toBeTruthy();
        // thumbnails
        expect(el.querySelector('button[aria-label="Show photo 3"]')).toBeTruthy();
        expect(el.querySelectorAll('video').length).toBe(0);
    });

    it('preserves the listing video as its own slide with player and thumbnail', async () => {
        const el = await renderGallery({
            auctionId: 'a1',
            title: 't',
            images: [
                { id: 'i1', url: 'https://cdn.example.com/1.jpg' },
                { id: 'i2', url: 'https://cdn.example.com/2.jpg' },
            ],
            hasVideo: true,
        });
        const video = el.querySelector('video');
        expect(video).toBeTruthy();
        expect(video!.getAttribute('src')).toBe('/api/listing-video/a1');
        expect(el.textContent).toContain('1 / 3');
        expect(el.querySelector('button[aria-label="Show video"]')).toBeTruthy();
    });

    it('swipe scroll updates the counter with clamping', async () => {
        const el = await renderGallery({
            auctionId: 'a1',
            title: 't',
            images: [
                { id: 'i1', url: 'https://cdn.example.com/1.jpg' },
                { id: 'i2', url: 'https://cdn.example.com/2.jpg' },
            ],
            hasVideo: false,
        });
        const track = el.querySelector('.overflow-x-auto') as HTMLElement;
        Object.defineProperty(track, 'clientWidth', { value: 300, configurable: true });
        Object.defineProperty(track, 'scrollLeft', { value: 300, configurable: true });
        await act(async () => {
            track.dispatchEvent(new Event('scroll'));
        });
        expect(el.textContent).toContain('2 / 2');
        // overscroll clamps to last slide
        Object.defineProperty(track, 'scrollLeft', { value: 9000, configurable: true });
        await act(async () => {
            track.dispatchEvent(new Event('scroll'));
        });
        expect(el.textContent).toContain('2 / 2');
    });

    it('arrow buttons drive scrollTo on the track', async () => {
        const el = await renderGallery({
            auctionId: 'a1',
            title: 't',
            images: [
                { id: 'i1', url: 'https://cdn.example.com/1.jpg' },
                { id: 'i2', url: 'https://cdn.example.com/2.jpg' },
            ],
            hasVideo: false,
        });
        const next = el.querySelector('button[aria-label="Next photo"]')!;
        await act(async () => {
            next.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        });
        expect(Element.prototype.scrollTo).toHaveBeenCalled();
    });
});

// ---------- home hero ----------
describe('HomeHero photo fan', () => {
    function heroAuction(id: string, imgUrl: string | null) {
        return {
            id,
            delivery_available: false,
            auction_images: imgUrl ? [{ url: imgUrl, position: 0 }] : [],
        } as never;
    }

    async function renderHero(auctions: never[]) {
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
        await act(async () => {
            root!.render(React.createElement(HomeHero, { auctions, loading: false }));
        });
        return container;
    }

    it('dedupes fan photos by URL and caps at three', async () => {
        const el = await renderHero([
            heroAuction('a', 'https://cdn.example.com/x.jpg'),
            heroAuction('b', 'https://cdn.example.com/x.jpg'),
            heroAuction('c', 'https://cdn.example.com/y.jpg'),
            heroAuction('d', 'https://cdn.example.com/z.jpg'),
            heroAuction('e', 'https://cdn.example.com/w.jpg'),
        ]);
        const fanImgs = el.querySelectorAll('section div[aria-hidden="true"] img');
        expect(fanImgs.length).toBe(3);
        const srcs = Array.from(fanImgs).map((i) => i.getAttribute('src'));
        expect(new Set(srcs).size).toBe(3);
    });

    it('fan markup is present at mobile sizes (no hidden-until-sm removal of the selected element)', async () => {
        const el = await renderHero([heroAuction('a', 'https://cdn.example.com/x.jpg')]);
        const fan = el.querySelector('section div[aria-hidden="true"]') as HTMLElement;
        expect(fan).toBeTruthy();
        expect(fan.className).not.toMatch(/(^|\s)hidden(\s|$)/);
        expect(fan.className).toContain('h-[140px]');
    });

    it('shows live listing count from loaded data', async () => {
        const el = await renderHero([
            heroAuction('a', null),
            heroAuction('b', null),
        ]);
        expect(el.textContent).toContain('2');
        expect(el.textContent).toContain('live listings');
    });
});
