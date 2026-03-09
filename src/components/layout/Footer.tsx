import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200 dark:bg-zinc-950 dark:border-zinc-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center mb-4">
                            <span className="text-lg font-black tracking-tighter text-black dark:text-white">
                                AUCTIONS<span className="text-gray-400 dark:text-gray-500">GH</span>
                            </span>
                        </Link>
                        <p className="text-sm text-gray-500 mb-4 dark:text-gray-400">
                            Ghana&apos;s leading online auction marketplace. Buy and sell anything at the best prices.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4 dark:text-white">
                            Marketplace
                        </h3>
                        <ul className="space-y-2.5 text-sm text-gray-500 dark:text-gray-400">
                            <li><Link href="/auctions" className="hover:text-black transition-colors dark:hover:text-white">Browse Auctions</Link></li>
                            <li><Link href="/auctions/create" className="hover:text-black transition-colors dark:hover:text-white">Sell an Item</Link></li>
                            <li><Link href="/dashboard" className="hover:text-black transition-colors dark:hover:text-white">Dashboard</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4 dark:text-white">
                            Support
                        </h3>
                        <ul className="space-y-2.5 text-sm text-gray-500 dark:text-gray-400">
                            <li><Link href="/faq" className="hover:text-black transition-colors dark:hover:text-white">FAQ</Link></li>
                            <li><Link href="/safety" className="hover:text-black transition-colors dark:hover:text-white">Safety Tips</Link></li>
                            <li><Link href="/privacy" className="hover:text-black transition-colors dark:hover:text-white">Privacy Policy</Link></li>
                            <li><Link href="/contact" className="hover:text-black transition-colors dark:hover:text-white">Contact Us</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-black uppercase tracking-widest mb-4 dark:text-white">
                            Contact
                        </h3>
                        <ul className="space-y-2.5 text-sm text-gray-500 dark:text-gray-400">
                            <li>Accra, Ghana</li>
                            <li>+233 257396067</li>
                            <li>hello@auctionsgh.com</li>
                        </ul>
                    </div>
                </div>

                <div className="mt-10 pt-6 border-t border-gray-200 flex items-center justify-between dark:border-zinc-800">
                    <span className="text-xs text-gray-400 uppercase tracking-widest dark:text-gray-500">
                        &copy; {new Date().getFullYear()} AuctionsGH
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">All rights reserved.</span>
                </div>
            </div>
        </footer>
    );
}
