import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import ConditionalNav from '@/components/layout/ConditionalNav';
import MainContent from '@/components/layout/MainContent';
import Footer from '@/components/layout/Footer';
import Providers from '@/components/layout/Providers';
import FloatingChatToast from '@/components/layout/FloatingChatToast';
import FloatingOfferToast from '@/components/layout/FloatingOfferToast';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Script from 'next/script';

// All pages use Supabase at runtime — prevent static prerender at build time
export const dynamic = 'force-dynamic';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com';
const DEFAULT_OG_IMAGE = '/opengraph-image';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Auctions GH — Ghana's Online Auction Marketplace",
    template: '%s | Auctions GH',
  },
  description:
    "Buy and sell smartphones and electronics at the best prices through live online auctions. Ghana's leading auction marketplace — bid, win, and pay securely.",
  keywords: [
    'Ghana auction', 'online auction Ghana', 'buy phones Ghana', 'sell phones Ghana',
    'smartphone auction', 'electronics marketplace Ghana', 'live auction', 'bid online',
    'Auctions GH', 'Ghana marketplace',
  ],
  authors: [{ name: 'Auctions GH', url: SITE_URL }],
  creator: 'Auctions GH',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    url: SITE_URL,
    siteName: 'Auctions GH',
    title: "Auctions GH — Ghana's Online Auction Marketplace",
    description:
      "Buy and sell smartphones at the best prices through live online auctions. Ghana's leading auction marketplace.",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'Auctions GH — Online Auction Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Auctions GH — Ghana's Online Auction Marketplace",
    description:
      "Buy and sell smartphones at the best prices through live online auctions. Ghana's leading auction marketplace.",
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              document.documentElement.classList.remove('dark');
              document.documentElement.style.colorScheme = 'light';
              try { localStorage.removeItem('theme-preference'); } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${jakarta.variable} ${jakarta.className} antialiased`}>
        <Providers>
          <ConditionalNav />
          <MainContent>
            <FloatingChatToast />
            <FloatingOfferToast />
            <main className="min-h-screen pb-20 sm:pb-0">{children}</main>
            <div className="hidden sm:block">
              <Footer />
            </div>
          </MainContent>
        </Providers>
        <SpeedInsights />
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-HZQX8B5XC3"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-HZQX8B5XC3');
          `}
        </Script>
      </body>
    </html>
  );
}
