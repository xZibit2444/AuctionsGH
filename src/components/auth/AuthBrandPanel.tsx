'use client';

import Link from 'next/link';
import Image from 'next/image';

interface Props {
    variant: 'login' | 'signup';
}

export default function AuthBrandPanel({ variant }: Props) {
    return (
        <div className="hidden lg:flex lg:w-[45%] bg-white border-r border-gray-100 flex-col justify-between p-12">

            {/* Logo */}
            <Link href="/">
                <Image src="/logo.png" alt="AuctionsGH" width={180} height={50} className="h-12 w-auto object-contain" priority />
            </Link>

            {/* Center message */}
            <div className="space-y-8">
                <div className="space-y-2">
                    <p className="text-[11px] font-black text-amber-500 uppercase tracking-widest">
                        {variant === 'login' ? "Ghana's Premier" : 'Join the community'}
                    </p>
                    <h2 className="text-5xl font-black text-gray-900 leading-none tracking-tighter">
                        {variant === 'login'
                            ? <><span>Online</span><br /><span>Auction</span><br /><span>Platform</span></>
                            : <><span>Buy &amp; Sell</span><br /><span>Anything</span><br /><span>Securely</span></>
                        }
                    </h2>
                </div>

                {/* Divider */}
                <div className="w-12 h-0.5 bg-amber-400" />

                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                    {variant === 'login'
                        ? 'Bid on verified items. Sell yours to the highest bidder. Every transaction is secure.'
                        : 'Create your free account and start bidding within minutes. Verified listings. Protected transactions.'
                    }
                </p>

                {variant === 'signup' && (
                    <div className="space-y-3">
                        {['Free to join — no subscription', 'Bid on any active listing instantly', 'Sell your items at the best price', 'Secure payments via verified channels'].map((point) => (
                            <div key={point} className="flex items-center gap-3">
                                <div className="h-1.5 w-1.5 bg-amber-400 rounded-full shrink-0" />
                                <p className="text-sm text-gray-500">{point}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <p className="text-[11px] text-gray-300">&copy; 2025 AuctionsGH &middot; All rights reserved</p>
        </div>
    );
}
