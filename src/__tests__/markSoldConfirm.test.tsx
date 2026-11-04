// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
const fx = vi.hoisted(() => ({ update: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: fx.refresh }) }));
vi.mock('@/app/actions/updateListing', () => ({ setListingStatusAction: fx.update }));
import OwnerStatusControls from '@/components/auction/OwnerStatusControls';
let el: HTMLDivElement, root: Root;
function render(props = {}) { act(() => root.render(<OwnerStatusControls auctionId="listing-1" status="active" isPermanent bidCount={0} {...props} />)); }
function click(text: string, within: ParentNode = el) { const b = [...within.querySelectorAll('button')].find(b => b.textContent === text); expect(b).toBeTruthy(); act(() => b!.click()); }
beforeEach(() => { fx.update.mockReset(); fx.refresh.mockReset(); el = document.createElement('div'); document.body.append(el); root = createRoot(el); });
afterEach(() => { act(() => root.unmount()); el.remove(); });
describe('Mark sold site confirmation', () => {
    it('opens branded dialog without submitting or calling browser confirm', () => { const native = vi.spyOn(window, 'confirm'); render(); click('Mark sold'); expect(el.querySelector('[role="dialog"]')).toBeTruthy(); expect(el.textContent).toContain('It will be hidden from buyers. You can resume it later.'); expect(fx.update).not.toHaveBeenCalled(); expect(native).not.toHaveBeenCalled(); native.mockRestore(); });
    it('cancel and Escape leave listing untouched and restore focus', () => { render(); const trigger = el.querySelectorAll('button')[1]; trigger.focus(); click('Mark sold'); click('Cancel'); expect(el.querySelector('[role="dialog"]')).toBeNull(); expect(document.activeElement).toBe(trigger); click('Mark sold'); act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); expect(el.querySelector('[role="dialog"]')).toBeNull(); expect(fx.update).not.toHaveBeenCalled(); });
    it('confirms the same sold action exactly once and refreshes', async () => { fx.update.mockResolvedValue({ success: true }); render(); click('Mark sold'); click('Mark sold', el.querySelector('[role="dialog"]')!); await act(async () => { await Promise.resolve(); }); expect(fx.update).toHaveBeenCalledExactlyOnceWith('listing-1', 'sold_elsewhere'); expect(fx.refresh).toHaveBeenCalledOnce(); expect(el.querySelector('[role="dialog"]')).toBeNull(); });
    it('disables dismissal and confirm while saving', async () => { let finish!: (v: unknown) => void; fx.update.mockReturnValue(new Promise(r => { finish = r; })); render(); click('Mark sold'); click('Mark sold', el.querySelector('[role="dialog"]')!); expect(el.querySelector('[role="dialog"] button:disabled')).toBeTruthy(); act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))); expect(el.querySelector('[role="dialog"]')).toBeTruthy(); await act(async () => finish({ success: true })); });
    it('shows server error without refreshing or changing status', async () => { fx.update.mockResolvedValue({ success: false, error: 'Listing changed. Try again.' }); render(); click('Mark sold'); click('Mark sold', el.querySelector('[role="dialog"]')!); await act(async () => { await Promise.resolve(); }); expect(el.textContent).toContain('Listing changed. Try again.'); expect(fx.refresh).not.toHaveBeenCalled(); });
    it('keeps pause and resume behavior and eligibility unchanged', async () => { fx.update.mockResolvedValue({ success: true }); render(); click('Pause listing'); await act(async () => { await Promise.resolve(); }); expect(fx.update).toHaveBeenLastCalledWith('listing-1', 'pause'); render({ status: 'ended' }); click('Relist'); await act(async () => { await Promise.resolve(); }); expect(fx.update).toHaveBeenLastCalledWith('listing-1', 'resume'); render({ bidCount: 1 }); expect(el.textContent).toBe(''); render({ isPermanent: false }); expect(el.textContent).toBe(''); });
});

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'seller-1' }, profile: {} }) }));
vi.mock('@/hooks/useAuctions', () => ({ useAuctions: () => ({ loading: false, auctions: [{ id: 'listing-1', seller_id: 'seller-1', title: 'Test phone', listing_type: 'permanent', status: 'active', bid_count: 0, starting_price: 1000, current_price: 1000, images: [], created_at: '2026-11-01T00:00:00Z' }] }) }));
vi.mock('@/app/actions/delivery', () => ({ markShippedAction: vi.fn() }));
vi.mock('@/app/actions/deleteAuction', () => ({ deleteAuctionAction: vi.fn() }));
vi.mock('@/app/actions/relistAuction', () => ({ relistAuctionAction: vi.fn() }));
import ListingTable from '@/components/dashboard/ListingTable';
describe('Dashboard mark sold confirmation', () => {
    it('both responsive Mark sold buttons require confirmation and Cancel is safe', () => { act(() => root.render(<ListingTable />)); const triggers = [...el.querySelectorAll('button')].filter(b => b.textContent?.trim() === 'Mark sold'); expect(triggers).toHaveLength(2); for (const b of triggers) { act(() => b.click()); expect(el.querySelector('[role="dialog"]')).toBeTruthy(); expect(fx.update).not.toHaveBeenCalled(); click('Cancel'); } });
    it('confirm submits the selected listing and preserves existing ended state', async () => { fx.update.mockResolvedValue({ success: true }); act(() => root.render(<ListingTable />)); click('Mark sold'); click('Mark sold', el.querySelector('[role="dialog"]')!); await act(async () => { await Promise.resolve(); }); expect(fx.update).toHaveBeenCalledExactlyOnceWith('listing-1', 'sold_elsewhere'); expect(el.querySelector('[role="dialog"]')).toBeNull(); expect(el.textContent).toContain('ENDED'); });
});
