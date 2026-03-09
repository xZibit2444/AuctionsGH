type DeliveryLike = {
    status?: string | null;
    delivered_at?: string | null;
    created_at?: string | null;
};

const DELIVERY_STATUS_PRIORITY: Record<string, number> = {
    pending: 0,
    sent: 1,
    delivered: 2,
    completed: 3,
};

function toTimestamp(value?: string | null) {
    if (!value) return 0;
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
}

export function getPrimaryDelivery<T extends DeliveryLike>(deliveries: T[] | T | null | undefined): T | null {
    const rows = Array.isArray(deliveries)
        ? deliveries
        : deliveries
            ? [deliveries]
            : [];

    if (rows.length === 0) return null;

    return [...rows].sort((a, b) => {
        const statusDelta = (DELIVERY_STATUS_PRIORITY[b.status ?? ''] ?? -1) - (DELIVERY_STATUS_PRIORITY[a.status ?? ''] ?? -1);
        if (statusDelta !== 0) return statusDelta;

        const deliveredDelta = toTimestamp(b.delivered_at) - toTimestamp(a.delivered_at);
        if (deliveredDelta !== 0) return deliveredDelta;

        return toTimestamp(b.created_at) - toTimestamp(a.created_at);
    })[0];
}
