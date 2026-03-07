'use client';

import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';

const AUTH_ROUTES = ['/login', '/signup'];

export default function ConditionalNav() {
    const pathname = usePathname();
    if (AUTH_ROUTES.includes(pathname)) return null;
    return (
        <>
            <div className="hidden sm:block">
                <Sidebar />
            </div>
            <MobileNav />
        </>
    );
}
        </>
    );
}
