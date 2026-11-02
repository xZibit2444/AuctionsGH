export function listingDetailId(pathname: string): string | null {
    const match = /^\/auctions\/([^/]+)\/?$/.exec(pathname);
    if (!match || match[1] === 'create') return null;
    return match[1];
}
export function isListingUuid(id: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
