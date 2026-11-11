export const COVER_PRESETS = ['split', 'yellow', 'black'] as const;
export type CoverPreset = (typeof COVER_PRESETS)[number];

export function parseCover(value: string | null | undefined): { kind: 'image'; url: string } | { kind: 'preset'; preset: CoverPreset } {
    if (value && /^https?:\/\//i.test(value)) return { kind: 'image', url: value };
    const key = value?.startsWith('preset:') ? value.slice(7) : 'split';
    return { kind: 'preset', preset: (COVER_PRESETS as readonly string[]).includes(key) ? (key as CoverPreset) : 'split' };
}
