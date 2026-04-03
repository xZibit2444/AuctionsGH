export function isMissingShowPastBuysColumnError(error: unknown) {
    if (!error || typeof error !== 'object') return false;

    const maybeError = error as { code?: string; message?: string };
    const message = maybeError.message?.toLowerCase() ?? '';

    return maybeError.code === '42703'
        || maybeError.code === 'PGRST204'
        || message.includes('show_past_buys')
        || message.includes('column show_past_buys does not exist');
}
