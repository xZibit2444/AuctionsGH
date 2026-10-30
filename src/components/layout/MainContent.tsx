'use client';

import { usePathname } from 'next/navigation';
import ProfileShortcut from './ProfileShortcut';
import NotificationBell from './NotificationBell';

const AUTH_ROUTES = ['/login', '/signup'];

export default function MainContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuth = AUTH_ROUTES.includes(pathname);
    const isHome = pathname === '/';
    return (
        <div className={isAuth || isHome ? '' : 'sidebar-offset'}>
            {!isAuth && !isHome && (
                <div className="hidden sm:flex justify-end items-center gap-1 px-6 pt-1.5 -mb-1 relative z-30">
                    <NotificationBell />
                    <ProfileShortcut />
                </div>
            )}
            {children}
        </div>
    );
}
