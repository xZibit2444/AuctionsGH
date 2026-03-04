'use client';

import { useState } from 'react';
import Image from 'next/image';

interface PhoneImageGalleryProps {
    images: { url: string; position: number }[];
    alt: string;
}

export default function PhoneImageGallery({ images, alt }: PhoneImageGalleryProps) {
    const sorted = [...images].sort((a, b) => a.position - b.position);
    const [selected, setSelected] = useState(0);

    if (sorted.length === 0) {
        return (
            <div className="aspect-square rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <span className="text-6xl">📱</span>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Main image */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                <Image
                    src={sorted[selected]?.url ?? ''}
                    alt={`${alt} — photo ${selected + 1}`}
                    fill
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                    priority={selected === 0}
                />

                {/* Prev / Next arrows */}
                {sorted.length > 1 && (
                    <>
                        <button
                            onClick={() => setSelected((p) => (p === 0 ? sorted.length - 1 : p - 1))}
                            className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 dark:bg-gray-900/80 shadow flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                            aria-label="Previous image"
                        >
                            ‹
                        </button>
                        <button
                            onClick={() => setSelected((p) => (p === sorted.length - 1 ? 0 : p + 1))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-white/80 dark:bg-gray-900/80 shadow flex items-center justify-center text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-900 transition-colors"
                            aria-label="Next image"
                        >
                            ›
                        </button>
                    </>
                )}

                {/* Counter pill */}
                {sorted.length > 1 && (
                    <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2.5 py-1 rounded-full">
                        {selected + 1} / {sorted.length}
                    </span>
                )}
            </div>

            {/* Thumbnails */}
            {sorted.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                    {sorted.map((img, i) => (
                        <button
                            key={i}
                            onClick={() => setSelected(i)}
                            className={`relative h-16 w-16 shrink-0 rounded-xl overflow-hidden border-2 transition-colors ${i === selected
                                    ? 'border-emerald-500'
                                    : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                        >
                            <Image
                                src={img.url}
                                alt={`${alt} thumbnail ${i + 1}`}
                                fill
                                className="object-cover"
                                sizes="64px"
                            />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
