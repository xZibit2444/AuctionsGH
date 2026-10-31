'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const AUTH_ROUTES = ['/login', '/signup'];
// Single listing pages (/auctions/<id>) use the storefront header, no sidebar.
const isListingDetail = (pathname: string) => /^\/auctions\/(?!create$)[^/]+$/.test(pathname);

export default function ConditionalNav() {
    const pathname = usePathname();
    const [isDesktop, setIsDesktop] = useState(() =>
        typeof window !== 'undefined' ? window.innerWidth >= 640 : false
    );

    useEffect(() => {
        const updateViewport = () => setIsDesktop(window.innerWidth >= 640);
        updateViewport();
        window.addEventListener('resize', updateViewport);
        return () => window.removeEventListener('resize', updateViewport);
    }, []);

    if (AUTH_ROUTES.includes(pathname)) return null;
    // Homepage keeps the storefront header and regains the desktop sidebar;
    // listing-detail pages keep the approved header-only layout.
    if (pathname === '/') return isDesktop ? <Sidebar /> : <MobileNav />;
    if (isListingDetail(pathname)) return isDesktop ? null : <MobileNav />;
    return isDesktop ? <Sidebar /> : <MobileNav />;
}
