'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Footer from './Footer';

const isStorefrontRoute = (pathname: string) =>
    pathname === '/' || /^\/auctions\/(?!create$)[^/]+$/.test(pathname);

/**
 * Homepage and single-listing pages use the compact storefront footer from
 * the approved mockup, now shown on every viewport. Every other route keeps
 * the full site footer, which stays desktop-only.
 */
export default function ConditionalFooter() {
    const pathname = usePathname();
    if (!isStorefrontRoute(pathname)) {
        return (
            <div className="hidden sm:block">
                <Footer />
            </div>
        );
    }

    return (
        <footer className="flex flex-col items-start gap-1.5 border-t border-[#E9E6E0] bg-white px-5 pb-[84px] pt-[18px] text-[12.5px] text-[#6E675E] sm:flex-row sm:items-center sm:justify-between sm:px-7 sm:pb-[26px]">
            <span>
                <b className="font-bold text-[#191612]">AuctionsGH</b> &middot; Accra, Ghana
            </span>
            <span className="flex items-center gap-1">
                <Link href="/faq" className="hover:text-black">FAQ</Link> &middot;{' '}
                <Link href="/safety" className="hover:text-black">Safety Tips</Link> &middot;{' '}
                <Link href="/contact" className="hover:text-black">Contact</Link>
            </span>
        </footer>
    );
}
