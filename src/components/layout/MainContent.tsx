'use client';

import { usePathname } from 'next/navigation';
import ProfileShortcut from './ProfileShortcut';

const AUTH_ROUTES = ['/login', '/signup'];

export default function MainContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuth = AUTH_ROUTES.includes(pathname);
    return (
        <div className={isAuth ? '' : 'sidebar-offset'}>
            {!isAuth && (
                <div className="hidden sm:flex justify-end px-6 pt-4 -mb-2">
                    <ProfileShortcut />
                </div>
            )}
            {children}
        </div>
    );
}
