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
