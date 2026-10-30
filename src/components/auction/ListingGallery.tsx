'use client';

import { useCallback, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface GalleryImage {
    id: string;
    url: string;
}

type Slide =
    | { kind: 'image'; id: string; url: string }
    | { kind: 'video'; id: string };

interface ListingGalleryProps {
    auctionId: string;
    title: string;
    images: GalleryImage[];
    hasVideo: boolean;
    overlayBadge?: React.ReactNode;
    overlayActions?: React.ReactNode;
    /** Desktop card look: rounded corners and border */
    rounded?: boolean;
}

/**
 * Swipeable listing gallery: photos plus the optional listing video as a
 * first-class slide. Native scroll-snap powers swiping on phones; arrows and
 * thumbnails drive it on desktop.
 */
export default function ListingGallery({
    auctionId,
    title,
    images,
    hasVideo,
    overlayBadge,
    overlayActions,
    rounded = false,
}: ListingGalleryProps) {
    const slides: Slide[] = [
        ...images.map((img) => ({ kind: 'image' as const, id: img.id, url: img.url })),
        ...(hasVideo ? [{ kind: 'video' as const, id: 'listing-video' }] : []),
    ];
    const [index, setIndex] = useState(0);
    const trackRef = useRef<HTMLDivElement>(null);

    const handleScroll = useCallback(() => {
        const el = trackRef.current;
        if (!el || el.clientWidth === 0) return;
        const next = Math.round(el.scrollLeft / el.clientWidth);
        setIndex((prev) => {
            const clamped = Math.max(0, Math.min(slides.length - 1, next));
            return prev === clamped ? prev : clamped;
        });
    }, [slides.length]);

    const goTo = useCallback((i: number) => {
        const el = trackRef.current;
        if (!el) return;
        el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
    }, []);

    if (slides.length === 0) {
        return (
            <div
                className={`aspect-[4/3] bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-400 ${rounded ? 'rounded-2xl' : ''}`}
            >
                <svg className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
            </div>
        );
    }

    return (
        <div>
            <div className={`relative bg-stone-950 ${rounded ? 'rounded-2xl overflow-hidden border border-stone-200' : ''}`}>
                {overlayBadge && <div className="absolute left-3 top-3 z-10 sm:left-[14px] sm:top-[14px]">{overlayBadge}</div>}
                {overlayActions && <div className="absolute right-3 top-3 z-10 sm:right-[14px] sm:top-[14px] flex items-center gap-2">{overlayActions}</div>}

                <div
                    ref={trackRef}
                    onScroll={handleScroll}
                    className="flex overflow-x-auto scrollbar-hide"
                    style={{ scrollSnapType: 'x mandatory' }}
                >
                    {slides.map((slide, i) => (
                        <div key={slide.id} className="w-full shrink-0" style={{ scrollSnapAlign: 'center' }}>
                            {slide.kind === 'image' ? (
                                <img
                                    src={slide.url}
                                    alt={title}
                                    loading={i === 0 ? 'eager' : 'lazy'}
                                    draggable={false}
                                    className="w-full aspect-[4/3.4] sm:aspect-[4/3] object-cover select-none"
                                />
                            ) : (
                                <video
                                    controls
                                    playsInline
                                    preload="metadata"
                                    src={`/api/listing-video/${auctionId}`}
                                    className="w-full aspect-[4/3.4] sm:aspect-[4/3] object-contain bg-black"
                                />
                            )}
                        </div>
                    ))}
                </div>

                <span className="absolute right-3 bottom-3 z-10 rounded-full bg-black/80 px-2.5 py-1 text-[11px] sm:right-[14px] sm:bottom-[14px] sm:px-[11px] sm:text-[11.5px] font-bold text-white">
                    {index + 1} / {slides.length}
                </span>

                {slides.length > 1 && (
                    <>
                        <button
                            type="button"
                            onClick={() => goTo(Math.max(0, index - 1))}
                            disabled={index === 0}
                            aria-label="Previous photo"
                            className="absolute left-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-600 shadow-sm transition hover:text-black disabled:opacity-0 sm:flex"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => goTo(Math.min(slides.length - 1, index + 1))}
                            disabled={index === slides.length - 1}
                            aria-label="Next photo"
                            className="absolute right-2 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-stone-200 bg-white/95 text-stone-600 shadow-sm transition hover:text-black disabled:opacity-0 sm:flex"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </>
                )}
            </div>

            {slides.length > 1 && (
                <div className="mt-2.5 hidden sm:flex gap-2.5 overflow-x-auto pb-1">
                    {slides.map((slide, i) => (
                        <button
                            key={slide.id}
                            type="button"
                            onClick={() => goTo(i)}
                            aria-label={slide.kind === 'video' ? 'Show video' : `Show photo ${i + 1}`}
                            className={`shrink-0 w-[86px] h-16 rounded-[10px] overflow-hidden border-2 transition-colors ${i === index
                                ? 'border-amber-400'
                                : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                        >
                            {slide.kind === 'image' ? (
                                <img src={slide.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                            ) : (
                                <span className="flex h-full w-full items-center justify-center bg-black text-amber-400">
                                    <Play className="h-5 w-5" />
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
