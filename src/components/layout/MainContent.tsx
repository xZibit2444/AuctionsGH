'use client';

import { usePathname } from 'next/navigation';

const AUTH_ROUTES = ['/login', '/signup'];

export default function MainContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAuth = AUTH_ROUTES.includes(pathname);
    return (
        <div className={isAuth ? 'relative' : 'sidebar-offset relative'}>
            {children}
        </div>
    );
}
