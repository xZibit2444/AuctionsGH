import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ConditionalNav from '@/components/layout/ConditionalNav';
import Footer from '@/components/layout/Footer';
import Providers from '@/components/layout/Providers';
import FloatingChatToast from '@/components/layout/FloatingChatToast';
import FloatingOfferToast from '@/components/layout/FloatingOfferToast';
import PushNotificationsInit from '@/components/layout/PushNotificationsInit';
import { SpeedInsights } from '@vercel/speed-insights/next';

// All pages use Supabase at runtime — prevent static prerender at build time
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AuctionsGH — Ghana\'s Online Auction Marketplace',
  description:
    'Buy and sell anything at the best prices through live auctions. Ghana\'s leading online auction marketplace.',
  keywords: ['Ghana', 'auction', 'marketplace', 'buy', 'sell', 'items'],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900 antialiased`}>
        <Providers>
          <PushNotificationsInit />
          <ConditionalNav />
          <div className="sm:ml-55">
            <FloatingChatToast />
            <FloatingOfferToast />
            <main className="min-h-screen pb-20 sm:pb-0">{children}</main>
            <div className="hidden sm:block">
              <Footer />
            </div>
          </div>
        </Providers>
        <SpeedInsights />
      </body>
    </html>
  );
}
