/**
 * Listing-order rotation: visitors should not see the same listings in the
 * same order on every visit. The fetch window is shuffled client-side per
 * load; explicit sort choices (price, newest, ending soon) bypass it.
 */
export function shuffled<T>(list: readonly T[], rand: () => number = Math.random): T[] {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/**
 * Pin-first ordering: pinned listings always lead the homepage preview while
 * the rest of the pool keeps rotating per open. Returns a new array; input
 * order within each group is preserved (call after shuffling).
 */
export function pinFirst<T extends { is_pinned?: boolean | null }>(list: readonly T[]): T[] {
    return [...list.filter((a) => a.is_pinned), ...list.filter((a) => !a.is_pinned)];
}
