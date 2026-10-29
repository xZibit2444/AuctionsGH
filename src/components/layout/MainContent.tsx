'use client';

import { usePathname } from 'next/navigation';
import ProfileShortcut from './ProfileShortcut';

const AUTH_ROUTES = ['/login', '/signup'];

export default function MainContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuth = AUTH_ROUTES.includes(pathname);
    return (
        <div className={isAuth ? '' : 'sidebar-offset'}>
            {!isAuth && <ProfileShortcut className="hidden sm:block fixed top-4 right-6 z-30" />}
            {children}
        </div>
    );
}
