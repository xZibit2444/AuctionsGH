'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import MobileNav from './MobileNav';

const AUTH_ROUTES = ['/login', '/signup'];

export default function ConditionalNav() {
    const pathname = usePathname();
    if (AUTH_ROUTES.includes(pathname)) return null;
    return (
        <>
            <Navbar />
            <MobileNav />
        </>
    );
}
