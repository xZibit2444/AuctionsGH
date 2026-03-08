import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import ConditionalNav from '@/components/layout/ConditionalNav';
import MainContent from '@/components/layout/MainContent';
import Footer from '@/components/layout/Footer';
import Providers from '@/components/layout/Providers';
import FloatingChatToast from '@/components/layout/FloatingChatToast';
import FloatingOfferToast from '@/components/layout/FloatingOfferToast';
import PushNotificationsInit from '@/components/layout/PushNotificationsInit';
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

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AuctionsGH — Ghana's Online Auction Marketplace",
    template: '%s | AuctionsGH',
  },
  description:
    "Buy and sell smartphones and electronics at the best prices through live online auctions. Ghana's leading auction marketplace — bid, win, and pay securely.",
  keywords: [
    'Ghana auction', 'online auction Ghana', 'buy phones Ghana', 'sell phones Ghana',
    'smartphone auction', 'electronics marketplace Ghana', 'live auction', 'bid online',
    'AuctionsGH', 'Ghana marketplace',
  ],
  authors: [{ name: 'AuctionsGH', url: SITE_URL }],
  creator: 'AuctionsGH',
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website',
    locale: 'en_GH',
    url: SITE_URL,
    siteName: 'AuctionsGH',
    title: "AuctionsGH — Ghana's Online Auction Marketplace",
    description:
      "Buy and sell smartphones at the best prices through live online auctions. Ghana's leading auction marketplace.",
    images: [
      {
        url: '/logo.png',
        width: 1200,
        height: 630,
        alt: 'AuctionsGH — Online Auction Marketplace',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "AuctionsGH — Ghana's Online Auction Marketplace",
    description:
      "Buy and sell smartphones at the best prices through live online auctions. Ghana's leading auction marketplace.",
    images: ['/logo.png'],
  },
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/favicon.png',
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
    <html lang="en">
      <body className={`${jakarta.variable} ${jakarta.className} bg-white text-gray-900 antialiased`}>
        <Providers>
          <PushNotificationsInit />
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
