'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItem {
    q: string;
    a: string | React.ReactNode;
}

interface FAQSection {
    title: string;
    items: FAQItem[];
}

const sections: FAQSection[] = [
    {
        title: 'How Auctions Work',
        items: [
            {
                q: 'What is AuctionsGH?',
                a: 'AuctionsGH is Ghana\'s dedicated smartphone auction marketplace. Sellers list their phones, buyers compete by placing bids, and the highest bidder when the auction ends wins the phone. All prices are in Ghana Cedis (₵).',
            },
            {
                q: 'How do I place a bid?',
                a: 'Find an auction you want, click into it, and enter an amount above the current bid. Your bid must be at least ₵5.00 more than the current highest bid. Once placed, your bid is binding — you\'re committing to buy at that price if you win.',
            },
            {
                q: 'What is the minimum bid increment?',
                a: 'Every new bid must be at least ₵50.00 higher than the current highest bid. This keeps bidding fair and prevents spam bids.',
            },
            {
                q: 'How long do auctions run?',
                a: 'Sellers choose a duration when listing: 1 day, 3 days, 5 days, or 7 days. The exact end time is shown on every auction page with a live countdown.',
            },
            {
                q: 'What is snipe protection?',
                a: 'If a bid is placed in the last 2 minutes of an auction, the end time automatically extends by 2 minutes. This prevents "sniping" — the practice of placing a bid in the final seconds to win without giving others a chance to respond.',
            },
            {
                q: 'What happens when an auction ends?',
                a: 'The highest bidder wins. The auction status changes to "Sold" and both the buyer and seller are notified. If no bids were placed, the auction simply ends with no sale.',
            },
            {
                q: 'Can I cancel my bid?',
                a: 'Bids are final once placed. Before bidding, make sure you are ready to complete the purchase at your bid amount. If you win, you are expected to follow through with the seller.',
            },
        ],
    },
    {
        title: 'Selling',
        items: [
            {
                q: 'How do I list a phone for auction?',
                a: 'Create an account, then click "Sell Phone" in the navigation. Fill in the phone details — brand, model, storage, RAM, condition, and photos — set a starting price, choose a duration, and publish.',
            },
            {
                q: 'Which phone brands can I sell?',
                a: 'We support all major brands available in Ghana: Apple, Samsung, Tecno, Infinix, Xiaomi, Huawei, Nokia, Oppo, Vivo, Realme, Google, OnePlus, Motorola, and more.',
            },
            {
                q: 'How do I describe the condition of my phone?',
                a: (
                    <div className="space-y-2">
                        <p>Choose the condition that best matches your phone honestly:</p>
                        <ul className="space-y-1.5 mt-2">
                            <li><span className="font-bold text-black">Brand New (Sealed)</span> — Factory sealed, never opened</li>
                            <li><span className="font-bold text-black">Like New</span> — Used but in perfect condition, no scratches</li>
                            <li><span className="font-bold text-black">Good</span> — Minor cosmetic wear, fully functional</li>
                            <li><span className="font-bold text-black">Fair</span> — Noticeable wear, works well</li>
                            <li><span className="font-bold text-black">Poor</span> — Heavy wear or minor faults, still functional</li>
                        </ul>
                        <p className="mt-2">Misrepresenting condition can lead to disputes and account suspension.</p>
                    </div>
                ),
            },
            {
                q: 'How many photos can I upload?',
                a: 'Up to 6 photos per listing. Each image must be under 5 MB and in JPEG, PNG, or WebP format. High-quality photos from multiple angles significantly improve your chances of a successful sale.',
            },
            {
                q: 'What should I set as my starting price?',
                a: 'Set a starting price you\'re comfortable selling at. Bidding can push the final price higher, but auctions are not guaranteed to reach above the starting price. A lower starting price often attracts more bidders.',
            },
            {
                q: 'Can I edit or cancel my auction after it goes live?',
                a: 'Once a bid has been placed on your auction, you cannot cancel it. Before any bids are placed, you can cancel from your dashboard. Always double-check your details before publishing.',
            },
            {
                q: 'Are there any fees for sellers?',
                a: 'AuctionsGH is currently free to list. Any future fees will be communicated clearly before they take effect.',
            },
        ],
    },
    {
        title: 'Buying & Payment',
        items: [
            {
                q: 'How do I pay for a phone I won?',
                a: 'After winning, the seller\'s contact details are shared with you. Payment and handover is arranged directly between buyer and seller. We recommend meeting in a safe, public place for in-person transactions.',
            },
            {
                q: 'Is there buyer protection?',
                a: 'Currently, transactions are peer-to-peer. We strongly recommend inspecting the phone before completing payment, meeting in a public location, and only buying from sellers with positive feedback. Escrow and buyer protection features are on our roadmap.',
            },
            {
                q: 'What if the phone is not as described?',
                a: 'Always inspect the phone before paying. If there is a dispute, contact our support team with photos and details. Sellers found to be misrepresenting their listings will be suspended.',
            },
            {
                q: 'Can I buy a phone directly without bidding?',
                a: 'AuctionsGH is an auction-only marketplace — all purchases are through competitive bidding. There is no "Buy Now" option, though we may add this feature in the future.',
            },
        ],
    },
    {
        title: 'Account & Safety',
        items: [
            {
                q: 'Do I need an account to browse?',
                a: 'No — anyone can browse auctions. You only need to create a free account when you want to place a bid or list a phone.',
            },
            {
                q: 'How do I change my password?',
                a: 'Go to Settings → Security → Change Password. Enter your current password, then your new password (minimum 8 characters). Click "Update Password" to save.',
            },
            {
                q: 'How do I update my profile information?',
                a: 'Go to Settings → Profile. You can update your full name, username, phone number, and city/region. Your username is shown publicly on your listings.',
            },
            {
                q: 'What is a verified seller?',
                a: 'Verified sellers have had their identity confirmed by the AuctionsGH team. A blue checkmark appears next to their name. Buying from verified sellers adds an extra layer of trust.',
            },
            {
                q: 'How do I report a suspicious listing or user?',
                a: 'Use the report button on any listing or contact our support team directly. We review all reports promptly. Fraudulent listings are removed and accounts are banned.',
            },
            {
                q: 'Which regions of Ghana does AuctionsGH cover?',
                a: 'We serve all 16 regions of Ghana: Greater Accra, Ashanti, Western, Eastern, Central, Northern, Volta, Upper East, Upper West, Brong Ahafo, Bono East, Ahafo, Savannah, North East, Oti, and Western North.',
            },
            {
                q: 'How do I delete my account?',
                a: 'Go to Settings → Security → Danger Zone and click "Delete My Account". This permanently removes all your data, listings, and bid history. This action cannot be undone.',
            },
        ],
    },
    {
        title: 'Saved & Notifications',
        items: [
            {
                q: 'How do I save an auction to watch later?',
                a: 'Tap the heart ❤ icon on any auction card to save it. Saved auctions appear under the "Saved" tab in the navigation bar so you can track them easily.',
            },
            {
                q: 'What notifications will I receive?',
                a: 'You can configure notifications in Settings → Notifications. Available alerts include: new bids on your listings, "auction ending soon" reminders (1 hour before close), auction won confirmations, and new messages.',
            },
        ],
    },
];

function FAQItemRow({ item }: { item: FAQItem }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="border-b border-gray-100 last:border-0">
            <button
                onClick={() => setOpen((o) => !o)}
                className="w-full flex items-start justify-between gap-4 py-4 text-left group"
            >
                <span className={`text-sm font-semibold transition-colors ${open ? 'text-black' : 'text-gray-700 group-hover:text-black'}`}>
                    {item.q}
                </span>
                <span className="shrink-0 mt-0.5 text-gray-400 group-hover:text-black transition-colors">
                    {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
            </button>

            {open && (
                <div className="pb-5 pr-8 text-sm text-gray-600 leading-relaxed -mt-1">
                    {typeof item.a === 'string' ? <p>{item.a}</p> : item.a}
                </div>
            )}
        </div>
    );
}

export default function FAQPage() {
    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 pb-28 sm:pb-16">
            {/* Header */}
            <div className="mb-10 sm:mb-12">
                <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
                    Frequently Asked Questions
                </h1>
                <p className="text-sm text-gray-400 mt-2">
                    Everything you need to know about buying and selling on AuctionsGH.
                </p>
            </div>

            {/* Sections */}
            <div className="space-y-10">
                {sections.map((section) => (
                    <div key={section.title}>
                        <h2 className="text-[11px] font-black text-black uppercase tracking-widest mb-1 pb-3 border-b border-black">
                            {section.title}
                        </h2>
                        <div>
                            {section.items.map((item) => (
                                <FAQItemRow key={item.q} item={item} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* CTA */}
            <div className="mt-12 border border-gray-200 p-6 sm:p-8">
                <h3 className="text-sm font-black text-black uppercase tracking-widest mb-1">
                    Still have questions?
                </h3>
                <p className="text-sm text-gray-400 mt-1 mb-5">
                    Can&apos;t find what you&apos;re looking for? Our support team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <a
                        href="mailto:support@auctionsgh.com"
                        className="inline-flex items-center justify-center px-5 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors"
                    >
                        Contact Support
                    </a>
                    <Link
                        href="/auctions"
                        className="inline-flex items-center justify-center px-5 py-2.5 border border-gray-200 text-sm font-semibold text-black hover:border-black transition-colors"
                    >
                        Browse Auctions
                    </Link>
                </div>
            </div>
        </div>
    );
}
