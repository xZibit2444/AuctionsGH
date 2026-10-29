'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { submitSupportRequest, SUPPORT_TOPICS } from '@/app/actions/support';

const inputClass =
    'w-full border border-gray-200 px-4 py-3 text-sm text-black placeholder-gray-400 bg-white focus:outline-none focus:border-black transition-colors';

export default function SupportForm() {
    const { user, profile } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [topic, setTopic] = useState('');
    const [message, setMessage] = useState('');
    const [website, setWebsite] = useState('');
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    // Prefill once from the signed-in profile, never overwrite what the user typed.
    const shownName = name || profile?.full_name || '';
    const shownEmail = email || user?.email || '';

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (sending) return;
        setSending(true);
        setError('');
        const res = await submitSupportRequest({ name: shownName, email: shownEmail, topic, message, website });
        setSending(false);
        if (res.success) setDone(true);
        else setError(res.error || 'Something went wrong. Please try again.');
    };

    if (done) {
        return (
            <div className="border border-gray-200 p-6 sm:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600 mb-2">Request sent</p>
                <h2 className="text-xl font-black text-black">Thanks, we got your message.</h2>
                <p className="mt-3 text-sm text-gray-500 leading-relaxed">
                    We will reply to {shownEmail}. Keep an eye on your inbox and spam folder.
                </p>
                <Link href="/" className="inline-flex mt-6 px-5 py-2.5 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors">
                    Back to home
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="border border-gray-200 p-6 sm:p-8 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
                <div>
                    <label htmlFor="sp-name" className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Your name</label>
                    <input id="sp-name" value={shownName} onChange={(e) => setName(e.target.value)} maxLength={80} required autoComplete="name" className={inputClass} />
                </div>
                <div>
                    <label htmlFor="sp-email" className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Email for our reply</label>
                    <input id="sp-email" type="email" value={shownEmail} onChange={(e) => setEmail(e.target.value)} maxLength={120} required autoComplete="email" className={inputClass} />
                </div>
            </div>
            <div>
                <label htmlFor="sp-topic" className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">What is it about?</label>
                <select id="sp-topic" value={topic} onChange={(e) => setTopic(e.target.value)} required className={inputClass}>
                    <option value="" disabled>Choose a topic</option>
                    {SUPPORT_TOPICS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="sp-message" className="block text-[11px] font-black uppercase tracking-widest text-gray-500 mb-2">Tell us what happened</label>
                <textarea id="sp-message" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} required placeholder="Include the listing name or order number if you have one." className={`${inputClass} resize-none`} />
                <p className="text-[11px] text-gray-400 mt-1">{message.length}/2000</p>
            </div>
            {/* Honeypot: hidden from people, bots tend to fill it. */}
            <div className="hidden" aria-hidden="true">
                <label htmlFor="sp-website">Website</label>
                <input id="sp-website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
            <button type="submit" disabled={sending} className="px-6 py-3 bg-black text-white text-sm font-semibold hover:bg-gray-900 transition-colors disabled:opacity-50">
                {sending ? 'Sending...' : 'Send request'}
            </button>
        </form>
    );
}
