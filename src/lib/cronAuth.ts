export function isAuthorizedCronRequest(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        return { ok: false as const, status: 500, error: 'CRON_SECRET is not configured' };
    }

    const authHeader = request.headers.get('authorization') ?? '';
    const expected = `Bearer ${cronSecret}`;

    if (!timingSafeEqual(authHeader, expected)) {
        return { ok: false as const, status: 401, error: 'Unauthorized' };
    }

    return { ok: true as const };
}

function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
        const dummy = new TextEncoder().encode(a);
        crypto.subtle?.digest('SHA-256', dummy).catch(() => {});
        return false;
    }

    const encoder = new TextEncoder();
    const bufA = encoder.encode(a);
    const bufB = encoder.encode(b);

    let result = 0;
    for (let i = 0; i < bufA.length; i++) {
        result |= bufA[i] ^ bufB[i];
    }
    return result === 0;
}
