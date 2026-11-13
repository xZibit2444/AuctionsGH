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
                a: 'AuctionsGH is Ghana\'s dedicated online auction marketplace. Sellers list their items, buyers compete by placing bids, and the highest bidder when the auction ends wins the item. All prices are in Ghana Cedis (₵).',
            },
            {
                q: 'How do I place a bid?',
                a: 'Open any active auction and enter your bid amount in the bid box. Each new bid must be at least ₵50 above the current highest bid. Once placed, a bid is binding — you are committing to buy at that price if you win.',
            },
            {
                q: 'What is the minimum bid increment?',
                a: 'Every new bid must be at least ₵50 higher than the current highest bid. This keeps bidding fair and prevents low-value spam bids.',
            },
            {
                q: 'How long do auctions run?',
                a: 'Sellers choose a duration when listing — 1 day, 3 days, 5 days, or 7 days. The exact end time is shown on every auction page with a live countdown.',
            },
            {
                q: 'What is snipe protection?',
                a: 'If a bid is placed in the last 2 minutes of an auction, the timer automatically extends by 2 more minutes. This prevents "sniping" — placing a bid in the final seconds to win without giving other bidders a fair chance to respond.',
            },
            {
                q: 'What happens when an auction ends?',
                a: 'The highest bidder wins. The auction status changes to "Sold" and both buyer and seller are notified immediately. The winner then contacts the seller - by WhatsApp or the listing chat - to arrange payment and pickup. If no bids were placed the auction simply closes with no sale.',
            },
            {
                q: 'Can I cancel my bid after placing it?',
                a: 'Bids are final once placed. Before bidding, make sure you are ready to complete the purchase. If you win, you are expected to follow through and collect the item.',
            },
        ],
    },
    {
        title: 'Selling',
        items: [
            {
                q: 'How do I list an item for auction?',
                a: 'Create a free account, then click "Sell" in the navigation. Fill in the item details — title, condition, and photos — set a starting price and duration, then publish. Your listing goes live immediately.',
            },
            {
                q: 'What kinds of items can I sell?',
                a: 'You can list any used or new item for auction — electronics, phones, accessories, clothing, furniture, collectibles, and more. Items must be legal to sell in Ghana and accurately described.',
            },
            {
                q: 'How do I describe the condition of my item?',
                a: (
                    <div className="space-y-2">
                        <p>Choose the condition that most accurately matches your item. Be honest — misrepresenting condition leads to disputes and account suspension.</p>
                        <ul className="space-y-1.5 mt-2">
                            <li><span className="font-bold text-black">Brand New (Sealed)</span> — Factory sealed, never opened</li>
                            <li><span className="font-bold text-black">Like New</span> — Used briefly, perfect condition, no scratches</li>
                            <li><span className="font-bold text-black">Good</span> — Minor cosmetic wear, fully functional</li>
                            <li><span className="font-bold text-black">Fair</span> — Noticeable wear, works well</li>
                            <li><span className="font-bold text-black">Poor</span> — Heavy wear or minor faults, still functional</li>
                        </ul>
                    </div>
                ),
            },
            {
                q: 'How many photos can I upload?',
                a: 'Up to 6 photos per listing, each under 5 MB in JPEG, PNG, or WebP format. More high-quality photos from multiple angles — front, back, sides, screen, any damage — significantly improve buyer confidence and your final sale price.',
            },
            {
                q: 'What should I set as my starting price?',
                a: 'Set the lowest price you are comfortable accepting. Competitive bidding can push the final price higher, but auctions are not guaranteed to exceed the starting price. Lower starting prices typically attract more bidders.',
            },
            {
                q: 'Can I cancel my auction after it goes live?',
                a: 'Yes — but only if no bids have been placed yet. Go to your Seller Dashboard, find the listing, and click Delete. Once even one bid exists, the auction is locked and cannot be cancelled.',
            },
            {
                q: 'What areas does the marketplace serve?',
                a: 'Listings are currently available within Accra. Meetup and handover areas include East Legon, Osu, Airport Residential, Spintex, Tema, Adenta, Madina, Cantonments, Dansoman, Dzorwulu, Lapaz, Achimota, Kasoa, and more.',
            },
            {
                q: 'Are there any fees for sellers?',
                a: 'AuctionsGH is currently free to list. Any future fees will be communicated clearly and in advance before they take effect.',
            },
        ],
    },
    {
        title: 'Winning & Buying',
        items: [
            {
                q: 'I won an auction — what happens next?',
                a: (
                    <div className="space-y-2">
                        <p>Congratulations! Follow these steps to complete your purchase:</p>
                        <ol className="space-y-1.5 mt-2 list-decimal list-inside">
                            <li>You will receive a notification when your win is confirmed.</li>
                            <li>Contact the seller from the listing - by WhatsApp or the on-site chat - to arrange payment and pickup.</li>
                            <li>Meet the seller, inspect the item, and pay only when you are satisfied.</li>
                        </ol>
                        <p className="mt-1">Contact the seller promptly. If you go silent, the seller may report a ghost bid.</p>
                    </div>
                ),
            },
            {
                q: 'How does payment work?',
                a: 'All transactions are arranged directly between buyer and seller - typically cash on meetup after you inspect the item. There is no online payment through AuctionsGH, and AuctionsGH never holds or transfers money. Only pay once you are satisfied with the item.',
            },
            {
                q: 'Can I buy an item without bidding?',
                a: (
                    <div className="space-y-2">
                        <p>Yes — most listings are <span className="font-semibold text-black">Permanent Listings</span> with a fixed price. On these you make an offer or message the seller directly rather than competing in a timed auction. Permanent listings do not have a countdown timer and remain active until the seller marks the item sold or removes it.</p>
                        <p>Standard timed auctions still run through competitive bidding — the highest bidder at the end of the countdown wins.</p>
                    </div>
                ),
            },
            {
                q: 'What if I win but decide not to buy?',
                a: 'A winning bid is a commitment to purchase. If you back out without a valid reason the seller can report a ghost bid, which may result in restrictions on your account. Only bid on an item you genuinely intend to buy.',
            },
        ],
    },
    {
        title: 'Deals & Handover',
        items: [
            {
                q: 'How do I buy on AuctionsGH?',
                a: 'Find a listing, then make an offer or message the seller - in the on-site chat or on WhatsApp. Agree the price, payment method and pickup directly with the seller. AuctionsGH connects buyers and sellers but does not take payment or deliver items.',
            },
            {
                q: 'What happens after my offer is accepted?',
                a: 'A Deal & Chat page opens for you and the seller. Arrange payment and pickup there, inspect the item at handover, and pay only when satisfied. The seller marks the listing sold once the deal is complete.',
            },
            {
                q: 'Does AuctionsGH deliver items or hold payment?',
                a: 'No. Delivery, pickup and payment are agreed directly between buyer and seller. Meet in a safe public place, inspect the item first, and only then pay.',
            },
            {
                q: 'Where are my past orders?',
                a: 'Orders completed before this change remain visible as history on your Orders pages. New deals are no longer tracked as orders - they are arranged in the chat and closed when the seller marks the item sold.',
            },
        ],
    },
    {
        title: 'Messaging',
        items: [
            {
                q: 'Can I contact the seller or buyer directly?',
                a: 'Yes — every order has a built-in secure chat. Once an order is created, both the buyer and seller can send messages from the Order page. This keeps all communication in one place and creates a record if a dispute arises.',
            },
            {
                q: 'How do I open the chat?',
                a: (
                    <div className="space-y-1.5">
                        <p>There are two easy routes:</p>
                        <ul className="space-y-1 mt-1 list-disc list-inside">
                            <li>Open the <span className="font-semibold text-black">Order</span> page and scroll to the Chat section at the bottom.</li>
                            <li>From your <span className="font-semibold text-black">Dashboard</span>, click the <span className="font-semibold text-black">Chat</span> button next to any listing that has an active order — it jumps straight to the chat.</li>
                        </ul>
                    </div>
                ),
            },
            {
                q: 'Will I be notified of new messages?',
                a: 'Yes. A toast notification slides in from the bottom-right of the screen when a new message arrives, even if you are on a different page. The notification bell in the top navigation also highlights unread messages. Click the notification to go directly to the order chat.',
            },
            {
                q: 'Is the chat private?',
                a: 'Yes. Chat messages are only visible to the buyer and seller on that specific order. No other users can read your messages.',
            },
            {
                q: 'Can I send images or files in chat?',
                a: 'Currently chat supports text messages only (up to 2,000 characters per message). If you need to share photos — for example to document a dispute — please email them to our support team.',
            },
        ],
    },
    {
        title: 'Account & Safety',
        items: [
            {
                q: 'Do I need an account to browse?',
                a: 'No — anyone can browse and view auctions without signing in. You only need a free account when you want to place a bid or list an item.',
            },
            {
                q: 'What information do I need to sign up?',
                a: 'Email address, a password (minimum 8 characters, must include an uppercase letter, lowercase letter, and number), a username (3–20 characters, letters/numbers/underscores), your full name, a Ghana phone number (+233XXXXXXXXX), and your city.',
            },
            {
                q: 'How do I update my profile?',
                a: 'Go to Settings → Profile. You can update your full name, username, phone number, and city. Your username appears publicly on your listings and bids.',
            },
            {
                q: 'How do I change my password?',
                a: 'Go to Settings → Security → Change Password. Enter your current password and then your new password. Click "Update Password" to save.',
            },
            {
                q: 'What is a verified seller?',
                a: 'Verified sellers have had their identity confirmed by the AuctionsGH team. A blue checkmark appears next to their name on listings and their profile. Buying from verified sellers provides an extra layer of trust.',
            },
            {
                q: 'How do I report a suspicious listing or user?',
                a: 'Use the report button on any listing, or contact our support team directly via email. All reports are reviewed promptly. Fraudulent listings are removed and accounts are permanently banned.',
            },
            {
                q: 'How do I delete my account?',
                a: 'Go to Settings → Security → Danger Zone and click "Delete My Account". This permanently removes all your data, listings, bid history, and messages. This action cannot be undone.',
            },
        ],
    },
    {
        title: 'Saved Auctions & Notifications',
        items: [
            {
                q: 'How do I save an auction to watch later?',
                a: 'Open any auction and tap the Save button on the listing detail page. All saved auctions appear in the Saved section of the navigation so you can track them easily without having to search again.',
            },
            {
                q: 'What notifications will I receive?',
                a: (
                    <div className="space-y-1.5">
                        <p>AuctionsGH sends the following notifications:</p>
                        <ul className="space-y-1 mt-1 list-disc list-inside">
                            <li><span className="font-semibold text-black">Outbid</span> — email when someone places a higher bid on an auction you are in</li>
                            <li><span className="font-semibold text-black">Auction Won</span> — email and in-app alert when you win</li>
                            <li><span className="font-semibold text-black">Item Sold</span> — email and in-app alert when your listing sells</li>
                            <li><span className="font-semibold text-black">Order Confirmed</span> — in-app notification with a link to your delivery code</li>
                            <li><span className="font-semibold text-black">New Message</span> — real-time toast and bell notification when your chat partner writes</li>
                        </ul>
                    </div>
                ),
            },
            {
                q: 'Where do I see all my notifications?',
                a: 'Tap the bell icon in the top navigation bar to open the notification panel. Unread notifications are highlighted. Clicking a notification takes you directly to the relevant auction, order, or chat.',
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
        <div className="bg-gray-50 min-h-screen">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 pb-28 sm:pb-16">
            {/* Header */}
            <div className="mb-10 sm:mb-12">
                <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tight">
                    Frequently Asked Questions
                </h1>
                <p className="text-sm text-gray-500 mt-2">
                    Everything you need to know about buying and selling on AuctionsGH.
                </p>
            </div>

            {/* Sections */}
            <div className="space-y-6">
                {sections.map((section) => (
                    <div key={section.title} className="rounded-[20px] border border-gray-200 bg-white px-5 sm:px-6">
                        <h2 className="text-[11px] font-black text-amber-700 uppercase tracking-widest mb-1 pt-5 pb-3 border-b border-gray-100">
                            {section.title}
                        </h2>
                        <div className="pb-2">
                            {section.items.map((item) => (
                                <FAQItemRow key={item.q} item={item} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* CTA */}
            <div className="mt-12 rounded-[20px] border border-gray-200 bg-white p-6 sm:p-8">
                <h3 className="text-sm font-black text-black uppercase tracking-widest mb-1">
                    Still have questions?
                </h3>
                <p className="text-sm text-gray-500 mt-1 mb-5">
                    Can&apos;t find what you&apos;re looking for? Our support team is here to help.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        href="/support"
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-amber-400 text-black text-sm font-extrabold hover:bg-amber-500 transition-colors"
                    >
                        Contact Support
                    </Link>
                    <Link
                        href="/auctions"
                        className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-black hover:border-gray-400 transition-colors"
                    >
                        Browse Auctions
                    </Link>
                </div>
            </div>
        </div>
        </div>
    );
}
