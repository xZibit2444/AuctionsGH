import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ConditionalNav from '@/components/layout/ConditionalNav';
import Footer from '@/components/layout/Footer';
import Providers from '@/components/layout/Providers';
import FloatingChatToast from '@/components/layout/FloatingChatToast';
import FloatingOfferToast from '@/components/layout/FloatingOfferToast';
import PushNotificationsInit from '@/components/layout/PushNotificationsInit';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AuctionsGH — Ghana\'s Smartphone Auction Marketplace',
  description:
    'Buy and sell smartphones at the best prices through live auctions. Ghana\'s leading mobile phone marketplace.',
  keywords: ['Ghana', 'auction', 'smartphone', 'phone', 'marketplace', 'buy', 'sell'],
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
          <FloatingChatToast />
          <FloatingOfferToast />
          <main className="min-h-screen pb-20 sm:pb-0">{children}</main>
          <div className="hidden sm:block">
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
