/**
 * Controlled-fixture tests for browse filter URL composition and price-range
 * normalization. Pure functions; no live data. Run with: npx vitest run
 */
import { describe, expect, it } from 'vitest';
import { buildBrowseSearch, normalizePriceRange } from '@/lib/browseParams';

describe('buildBrowseSearch', () => {
    it('composes query, category, sort and all filters into one URL', () => {
        const qs = buildBrowseSearch({
            q: 'iphone', brand: 'Apple', sort: 'current_price:asc',
            cond: 'like_new', min: '1000', max: '8000', del: true,
        });
        const p = new URLSearchParams(qs);
        expect(p.get('q')).toBe('iphone');
        expect(p.get('brand')).toBe('Apple');
        expect(p.get('sort')).toBe('current_price:asc');
        expect(p.get('cond')).toBe('like_new');
        expect(p.get('min')).toBe('1000');
        expect(p.get('max')).toBe('8000');
        expect(p.get('delivery')).toBe('1');
    });

    it('omits defaults and empty values', () => {
        expect(buildBrowseSearch({ q: '', brand: 'All', sort: 'shuffled', cond: 'All', min: '', max: '', del: false })).toBe('');
        expect(buildBrowseSearch({ q: '', brand: 'All', sort: 'created_at:desc', cond: 'All', min: '', max: '', del: false })).toBe('sort=created_at%3Adesc');
    });

    it('keeps an explicit Ending Soon choice in the URL so it stays truly sorted', () => {
        const qs = buildBrowseSearch({ q: '', brand: 'All', sort: 'ends_at:asc', cond: 'All', min: '', max: '', del: false });
        expect(qs).toBe('sort=ends_at%3Aasc');
    });

    it('round-trips through URLSearchParams parsing', () => {
        const state = { q: 'a b', brand: 'Samsung', sort: 'ends_at:asc', cond: 'good', min: '500', max: '', del: false };
        const p = new URLSearchParams(buildBrowseSearch(state));
        expect(p.get('q')).toBe('a b');
        expect(p.get('cond')).toBe('good');
        expect(p.get('min')).toBe('500');
        expect(p.get('max')).toBeNull();
        expect(p.get('delivery')).toBeNull();
    });
});

describe('normalizePriceRange', () => {
    it('swaps a reversed min/max pair', () => {
        expect(normalizePriceRange('8000', '1000')).toEqual({ min: '1000', max: '8000' });
    });

    it('keeps an ordered pair as typed', () => {
        expect(normalizePriceRange('1000', '8000')).toEqual({ min: '1000', max: '8000' });
    });

    it('keeps single-sided and blank inputs unchanged', () => {
        expect(normalizePriceRange('', '8000')).toEqual({ min: '', max: '8000' });
        expect(normalizePriceRange('1000', '')).toEqual({ min: '1000', max: '' });
        expect(normalizePriceRange('', '')).toEqual({ min: '', max: '' });
    });
});
