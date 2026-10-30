'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Footer from './Footer';

const isStorefrontRoute = (pathname: string) =>
    pathname === '/' || /^\/auctions\/(?!create$)[^/]+$/.test(pathname);

/**
 * Homepage and single-listing pages use the compact storefront footer from
 * the approved mockup. Every other route keeps the full site footer.
 */
export default function ConditionalFooter() {
    const pathname = usePathname();
    if (!isStorefrontRoute(pathname)) return <Footer />;

    return (
        <footer className="flex items-center justify-between border-t border-[#E9E6E0] bg-white px-7 pb-[26px] pt-[18px] text-[12.5px] text-[#6E675E]">
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
