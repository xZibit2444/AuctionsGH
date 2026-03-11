export function isMissingBanColumnError(error: unknown) {
    if (!error || typeof error !== 'object') return false;

    const maybeError = error as { code?: string; message?: string };
    const message = maybeError.message?.toLowerCase() ?? '';

    return maybeError.code === '42703'
        || maybeError.code === 'PGRST204'
        || message.includes('profiles.is_banned')
        || message.includes('column is_banned does not exist')
        || message.includes('banned_at')
        || message.includes('banned_reason')
        || message.includes('banned_by');
}
