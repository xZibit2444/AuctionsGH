// Search nicknames/abbreviations. Matching only: listing titles are never changed.
// Each group is a set of terms that mean the same thing. Searching any term also
// searches the others (whole words/phrases only, so "ps5" does not match "ps50").

const GROUPS: string[][] = [
    ['ps5', 'ps 5', 'playstation 5', 'play station 5'],
    ['ps4', 'ps 4', 'playstation 4', 'play station 4'],
    ['ps3', 'ps 3', 'playstation 3'],
    ['ps2', 'ps 2', 'playstation 2'],
    ['psp', 'playstation portable'],
    ['xbox series x', 'xsx', 'xbox sx'],
    ['xbox series s', 'xss', 'xbox ss'],
    ['xbox one', 'xb1', 'xbone'],
    ['nintendo switch', 'switch', 'nswitch'],
    ['macbook pro', 'mbp', 'mac book pro'],
    ['macbook air', 'mba', 'mac book air'],
    ['macbook', 'mac book'],
    ['airpods', 'air pods', 'airpod', 'apods'],
    ['apple watch', 'iwatch', 'i watch'],
    ['ipad', 'i pad'],
    ['television', 'tv', 'smart tv'],
    ['refrigerator', 'fridge'],
    ['laptop', 'notebook'],
    ['hp elitebook', 'elitebook', 'elite book'],
    ['hp probook', 'probook', 'pro book'],
    ['hp pavilion', 'pavilion'],
    ['lenovo thinkpad', 'thinkpad', 'think pad'],
    ['galaxy s24 ultra', 's24 ultra', 's24u'],
    ['galaxy s23 ultra', 's23 ultra', 's23u'],
    ['galaxy s22 ultra', 's22 ultra', 's22u'],
    ['toyota', 'toyo'],
    ['mercedes benz', 'mercedes', 'benz', 'merc'],
    ['volkswagen', 'vw'],
    ['hyundai', 'hyundia'],
    ['starlink', 'star link'],
    ['ray-ban meta', 'rayban meta', 'meta glasses', 'ray ban meta'],
    ['power bank', 'powerbank'],
    ['wifi router', 'router', 'wi-fi router'],
    ['earphones', 'earbuds', 'ear buds', 'earpiece'],
    ['headphones', 'head phones', 'headset'],
    ['gopro', 'go pro'],
    ['galaxy z fold', 'z fold', 'zfold'],
    ['galaxy z flip', 'z flip', 'zflip'],
    ['air conditioner', 'aircon', 'air con'],
    ['joystick', 'gamepad'],
    ['i phone', 'iphone'],
    ['smartphone', 'phone', 'mobile', 'cellphone', 'cell phone'],
];

// "13pm", "15 pm" -> iPhone 13/15 Pro Max; "14pro", "14 pm" etc.
function iphoneShorthand(q: string): string[] {
    const out: string[] = [];
    let m = q.match(/^(?:i|ip|iphone)?\s*(\d{1,2})\s*(pm|promax|pro max)$/);
    if (m) out.push(`iphone ${m[1]} pro max`);
    m = q.match(/^(?:i|ip)\s*(\d{1,2})$/);
    if (m) out.push(`iphone ${m[1]}`);
    return out;
}

export function normalizeSearch(raw: string): string {
    return raw
        .toLowerCase()
        .replace(/[,()%*:\\"'`]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function escapeRegex(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MAX_TERMS = 12;

/** Returns the normalized query plus alias variants, original first. */
export function expandSearchTerms(raw: string): string[] {
    const q = normalizeSearch(raw);
    if (!q) return [];
    const out: string[] = [q];
    const add = (t: string) => {
        const v = t.trim();
        if (v && !out.includes(v)) out.push(v);
    };
    for (const s of iphoneShorthand(q)) add(s);
    for (const group of GROUPS) {
        for (const term of group) {
            const re = new RegExp(`(^| )${escapeRegex(term)}( |$)`);
            if (!re.test(q)) continue;
            for (const other of group) {
                if (other === term) continue;
                add(q.replace(re, (_m, a, b) => `${a}${other}${b}`));
            }
        }
        // "ps5" typed as "ps 5" etc. is covered by the group; also compact form
    }
    const compact = q.replace(/\s+/g, '');
    if (compact !== q && compact.length >= 3) add(compact);
    return out.slice(0, MAX_TERMS);
}

/** PostgREST .or() filter string over title, brand and model. */
export function buildSearchFilter(raw: string): string | null {
    const terms = expandSearchTerms(raw);
    if (terms.length === 0) return null;
    return terms
        .flatMap(t => [`title.ilike.%${t}%`, `brand.ilike.%${t}%`, `model.ilike.%${t}%`])
        .join(',');
}
