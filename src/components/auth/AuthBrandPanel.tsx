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

            <p className="text-[11px] text-gray-300">© 2025 AuctionsGH · All rights reserved</p>
        </div>
    );
}


            {/* Animated SVG background */}
            <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 600 800"
                preserveAspectRatio="xMidYMid slice"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                {/* Pulse rings from bottom-right */}
                <circle cx="520" cy="680" r="80" fill="none" stroke="#fbbf24" strokeWidth="1.5" opacity="0.35">
                    <animate attributeName="r" values="80;160;80" dur="4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.35;0;0.35" dur="4s" repeatCount="indefinite" />
                </circle>
                <circle cx="520" cy="680" r="80" fill="none" stroke="#fbbf24" strokeWidth="1" opacity="0.2">
                    <animate attributeName="r" values="80;220;80" dur="4s" begin="0.8s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;0;0.2" dur="4s" begin="0.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="520" cy="680" r="80" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.15">
                    <animate attributeName="r" values="80;280;80" dur="4s" begin="1.6s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.15;0;0.15" dur="4s" begin="1.6s" repeatCount="indefinite" />
                </circle>

                {/* Gavel icon — center */}
                <g opacity="0.07" transform="translate(260, 300) rotate(-30)">
                    <rect x="-15" y="-60" width="30" height="80" rx="6" fill="#92400e" />
                    <rect x="-32" y="-80" width="64" height="30" rx="8" fill="#78350f" />
                    <rect x="-4" y="20" width="8" height="100" rx="4" fill="#92400e" />
                </g>

                {/* Floating bid tag 1 */}
                <g>
                    <animateTransform attributeName="transform" type="translate" values="0,0; 0,-14; 0,0" dur="3.2s" repeatCount="indefinite" />
                    <rect x="60" y="180" width="110" height="42" rx="8" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.5" opacity="0.7" />
                    <text x="115" y="197" textAnchor="middle" fontSize="9" fontWeight="700" fill="#92400e" opacity="0.8" fontFamily="system-ui">BID</text>
                    <text x="115" y="212" textAnchor="middle" fontSize="13" fontWeight="900" fill="#b45309" fontFamily="system-ui">GH₵ 1,200</text>
                </g>

                {/* Floating bid tag 2 */}
                <g>
                    <animateTransform attributeName="transform" type="translate" values="0,0; 0,12; 0,0" dur="2.8s" begin="0.5s" repeatCount="indefinite" />
                    <rect x="400" y="260" width="130" height="42" rx="8" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.5" opacity="0.6" />
                    <text x="465" y="277" textAnchor="middle" fontSize="9" fontWeight="700" fill="#92400e" opacity="0.8" fontFamily="system-ui">WINNING BID</text>
                    <text x="465" y="292" textAnchor="middle" fontSize="13" fontWeight="900" fill="#b45309" fontFamily="system-ui">GH₵ 4,500</text>
                </g>

                {/* Floating bid tag 3 */}
                <g>
                    <animateTransform attributeName="transform" type="translate" values="0,0; 0,-10; 0,0" dur="3.8s" begin="1s" repeatCount="indefinite" />
                    <rect x="120" y="480" width="110" height="42" rx="8" fill="#fff7ed" stroke="#fb923c" strokeWidth="1.5" opacity="0.5" />
                    <text x="175" y="497" textAnchor="middle" fontSize="9" fontWeight="700" fill="#c2410c" opacity="0.8" fontFamily="system-ui">SOLD</text>
                    <text x="175" y="512" textAnchor="middle" fontSize="13" fontWeight="900" fill="#c2410c" fontFamily="system-ui">GH₵ 750</text>
                </g>

                {/* Sparkle dots */}
                <circle cx="100" cy="120" r="3" fill="#fbbf24" opacity="0.5">
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="r" values="3;4.5;3" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx="480" cy="160" r="2.5" fill="#f59e0b" opacity="0.4">
                    <animate attributeName="opacity" values="0.4;0.9;0.4" dur="2.5s" begin="0.3s" repeatCount="indefinite" />
                    <animate attributeName="r" values="2.5;4;2.5" dur="2.5s" begin="0.3s" repeatCount="indefinite" />
                </circle>
                <circle cx="350" cy="440" r="2" fill="#fbbf24" opacity="0.4">
                    <animate attributeName="opacity" values="0.4;0.8;0.4" dur="3s" begin="0.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="200" cy="620" r="3" fill="#f59e0b" opacity="0.3">
                    <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2.2s" begin="1.2s" repeatCount="indefinite" />
                    <animate attributeName="r" values="3;5;3" dur="2.2s" begin="1.2s" repeatCount="indefinite" />
                </circle>
                <circle cx="500" cy="380" r="2" fill="#fbbf24" opacity="0.5">
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="1.8s" begin="0.6s" repeatCount="indefinite" />
                </circle>
            </svg>

            {/* Logo */}
            <Link href="/" className="relative z-10">
                <Image src="/logo.png" alt="AuctionsGH" width={180} height={50} className="h-12 w-auto object-contain" priority />
            </Link>

            {/* Center message */}
            <div className="relative z-10 space-y-6">
                {variant === 'login' ? (
                    <>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Ghana&apos;s Premier</p>
                            <h2 className="text-5xl font-black text-gray-900 leading-none tracking-tighter">
                                Online<br />Auction<br />Platform
                            </h2>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                            Bid on verified items. Sell yours to the highest bidder. Every transaction is secure.
                        </p>
                        <div className="flex gap-6 pt-2">
                            <div>
                                <p className="text-2xl font-black text-gray-900">Accra</p>
                                <p className="text-[11px] text-amber-600 uppercase tracking-widest">&amp; Kumasi</p>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Join the community</p>
                            <h2 className="text-5xl font-black text-gray-900 leading-none tracking-tighter">
                                Buy &amp; Sell<br />Anything<br />Securely
                            </h2>
                        </div>
                        <p className="text-sm text-gray-500 leading-relaxed max-w-xs">
                            Create your free account and start bidding within minutes. Verified listings. Protected transactions.
                        </p>
                        <div className="space-y-3 pt-2">
                            {['Free to join — no subscription', 'Bid on any active listing instantly', 'Sell your items at the best price', 'Secure payments via verified channels'].map((point) => (
                                <div key={point} className="flex items-center gap-3">
                                    <div className="h-1.5 w-1.5 bg-amber-500 rounded-full shrink-0" />
                                    <p className="text-sm text-gray-600">{point}</p>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            <p className="relative z-10 text-[11px] text-gray-400">© 2025 AuctionsGH · All rights reserved</p>
        </div>
    );
}
