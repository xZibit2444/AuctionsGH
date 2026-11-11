import type { ReactNode } from 'react';
import { parseCover } from '@/lib/cover';

const PRESET_CLASS = {
    split: 'cover-split',
    yellow: 'bg-amber-400',
    black: 'bg-neutral-900',
} as const;

/** Wide header banner for profile cards. Server- and client-safe. */
export default function ProfileCover({ coverUrl, children }: { coverUrl?: string | null; children?: ReactNode }) {
    const cover = parseCover(coverUrl);
    return (
        <div
            className={`relative aspect-[3/1] max-h-52 min-h-[110px] w-full overflow-hidden ${cover.kind === 'preset' ? PRESET_CLASS[cover.preset] : 'bg-gray-100'}`}
        >
            {cover.kind === 'image' && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover.url} alt="" className="h-full w-full object-cover" />
            )}
            {children}
        </div>
    );
}
