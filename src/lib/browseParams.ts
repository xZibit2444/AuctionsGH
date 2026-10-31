/** Shared URL/filter-state helpers for the browse pages (/auctions, /listings). */

export interface BrowseFilterState {
    q: string;
    brand: string;
    sort: string;
    cond: string;
    min: string;
    max: string;
    del: boolean;
}

export const DEFAULT_BROWSE_SORT = 'shuffled';

/** Serialize browse state to a query string, omitting defaults. */
export function buildBrowseSearch(st: BrowseFilterState): string {
    const params = new URLSearchParams();
    if (st.q) params.set('q', st.q);
    if (st.brand && st.brand !== 'All') params.set('brand', st.brand);
    if (st.sort && st.sort !== DEFAULT_BROWSE_SORT) params.set('sort', st.sort);
    if (st.cond && st.cond !== 'All') params.set('cond', st.cond);
    if (st.min) params.set('min', st.min);
    if (st.max) params.set('max', st.max);
    if (st.del) params.set('delivery', '1');
    return params.toString();
}

/**
 * Normalize a user-entered price range: blank/non-numeric stays as typed,
 * and a reversed pair (min > max) is swapped so the filter can never
 * silently match nothing.
 */
export function normalizePriceRange(min: string, max: string): { min: string; max: string } {
    const mn = min === '' || Number.isNaN(Number(min)) ? null : Number(min);
    const mx = max === '' || Number.isNaN(Number(max)) ? null : Number(max);
    if (mn != null && mx != null && mn > mx) {
        return { min: max, max: min };
    }
    return { min, max };
}
