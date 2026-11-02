import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import ConditionalNav from '@/components/layout/ConditionalNav';
import MainContent from '@/components/layout/MainContent';
import ConditionalFooter from '@/components/layout/ConditionalFooter';
import Providers from '@/components/layout/Providers';
import FloatingChatToast from '@/components/layout/FloatingChatToast';
import FloatingOfferToast from '@/components/layout/FloatingOfferToast';
import { SpeedInsights } from '@vercel/speed-insights/next';
import SignupTracker from '@/components/analytics/SignupTracker';
import Script from 'next/script';

// All pages use Supabase at runtime â prevent static prerender at build time
export const dynamic = 'force-dynamic';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://auctionsgh.com').replace(/\/+$/, '');
const DEFAULT_OG_IMAGE = '/opengraph-image';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AuctionsGH - Buy and Sell in Ghana',
    template: '%s | AuctionsGH',
  },
  description: 'Buy and sell phones, electronics, furniture, vehicles and more across Ghana. Browse listings, make offers or bid, and arrange payment and collection with the seller.',
  authors: [{ name: 'AuctionsGH', url: SITE_URL }],
  creator: 'AuctionsGH',
  robots: {
    index: true,
    follow: true,
    googleBot: { 'max-image-preview': 'large' },
  },
  openGraph: {
    type: 'website', locale: 'en_GH', siteName: 'AuctionsGH',
    title: 'AuctionsGH - Buy and Sell in Ghana',
    description: 'Browse phones, furniture, electronics, vehicles and more from sellers across Ghana.',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'AuctionsGH marketplace' }],
  },
  twitter: {
    card: 'summary_large_image', title: 'AuctionsGH - Buy and Sell in Ghana',
    description: 'Browse listings and arrange payment and collection with sellers across Ghana.',
    images: [DEFAULT_OG_IMAGE],
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
          <SignupTracker />
          <ConditionalNav />
          <MainContent>
            <FloatingChatToast />
            <FloatingOfferToast />
            <main className="min-h-screen pb-20 sm:pb-0">{children}</main>
            <ConditionalFooter />
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
