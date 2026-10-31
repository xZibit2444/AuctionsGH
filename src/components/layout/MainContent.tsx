'use client';

import { usePathname } from 'next/navigation';
import ProfileShortcut from './ProfileShortcut';
import NotificationBell from './NotificationBell';
import HomeHeader from './HomeHeader';

const AUTH_ROUTES = ['/login', '/signup'];

export default function MainContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuth = AUTH_ROUTES.includes(pathname);
    const isHome = pathname === '/';
    const isListing = /^\/auctions\/(?!create$)[^/]+$/.test(pathname);
    const plain = isAuth || isHome || isListing;
    return (
        <div className={plain ? (isListing ? 'pt-14 sm:pt-0' : '') : 'sidebar-offset'}>
            {isListing && <HomeHeader />}
            {!isAuth && !isHome && !isListing && (
                <div className="hidden sm:flex justify-end items-center gap-1 px-6 pt-1.5 -mb-1 relative z-30">
                    <NotificationBell />
                    <ProfileShortcut />
                </div>
            )}
            {children}
        </div>
    );
}
