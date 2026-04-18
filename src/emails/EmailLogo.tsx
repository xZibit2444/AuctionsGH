import { Img, Link } from '@react-email/components';
import * as React from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';

interface EmailLogoProps {
    href?: string;
}

export default function EmailLogo({ href = SITE_URL }: EmailLogoProps) {
    return (
        <Link href={href} style={logoLink}>
            <Img
                src={`${SITE_URL}/logo.png`}
                alt="AuctionsGH Logo"
                width="150"
                height="50"
                style={logoImage}
            />
        </Link>
    );
}

const logoLink = {
    display: 'block',
    textAlign: 'center' as const,
    textDecoration: 'none',
    margin: '0 0 24px',
};

const logoImage = {
    display: 'inline-block',
};
