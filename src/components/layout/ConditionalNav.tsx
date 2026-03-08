'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const AUTH_ROUTES = ['/login', '/signup'];

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
    return isDesktop ? <Sidebar /> : <MobileNav />;
}
