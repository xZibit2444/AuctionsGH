import { describe, it, expect } from 'vitest';
import { expandSearchTerms, buildSearchFilter } from '@/lib/searchAliases';

describe('search aliases', () => {
    it('ps5 also finds PlayStation 5', () => {
        const t = expandSearchTerms('PS5');
        expect(t).toContain('ps5');
        expect(t).toContain('playstation 5');
        expect(t).not.toContain('playstation 4');
    });
    it('playstation 5 finds ps5', () => {
        expect(expandSearchTerms('playstation 5')).toContain('ps5');
    });
    it('13pm finds iPhone 13 Pro Max', () => {
        expect(expandSearchTerms('13pm')).toContain('iphone 13 pro max');
    });
    it('replaces only whole words', () => {
        expect(expandSearchTerms('ps50')).toEqual(['ps50']);
    });
    it('replaces the term inside a longer query', () => {
        expect(expandSearchTerms('ps5 console')).toContain('playstation 5 console');
    });
    it('strips characters that would break the filter', () => {
        const f = buildSearchFilter('a,b)(c')!;
        expect(f).not.toMatch(/ilike\.%[^,]*[()]/);
        expect(buildSearchFilter('   ')).toBeNull();
    });
});
