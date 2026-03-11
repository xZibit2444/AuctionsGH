import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="mt-10 border-t border-white/50 bg-[linear-gradient(180deg,#1f1710_0%,#120e09_100%)] text-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center mb-4">
                            <span className="text-lg font-black tracking-tighter text-white">
                                AUCTIONS<span className="text-amber-300">GH</span>
                            </span>
                        </Link>
                        <p className="text-sm text-white/68 mb-4 leading-6">
                            A cleaner, safer auction marketplace for Ghana. Discover trusted listings, live bidding, and inspection-first handovers.
                        </p>
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/75">
                            <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            Live bidding across Accra
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
                            Marketplace
                        </h3>
                        <ul className="space-y-2.5 text-sm text-white/68">
                            <li><Link href="/auctions" className="hover:text-white transition-colors">Browse Auctions</Link></li>
                            <li><Link href="/auctions/create" className="hover:text-white transition-colors">Sell an Item</Link></li>
                            <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
                            Support
                        </h3>
                        <ul className="space-y-2.5 text-sm text-white/68">
                            <li><Link href="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
                            <li><Link href="/safety" className="hover:text-white transition-colors">Safety Tips</Link></li>
                            <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-white uppercase tracking-widest mb-4">
                            Contact
                        </h3>
                        <ul className="space-y-2.5 text-sm text-white/68">
                            <li>Accra, Ghana</li>
                            <li>hello@auctionsgh.com</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs text-white/42 uppercase tracking-widest">
                        &copy; {new Date().getFullYear()} AuctionsGH
                    </span>
                    <span className="text-xs text-white/42">All rights reserved.</span>
                </div>
            </div>
        </footer>
    );
}
