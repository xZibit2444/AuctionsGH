export const COMPLETED_ORDER_STATUSES = ['completed', 'pin_verified'] as const;

export const CANCELLED_ORDER_STATUSES = [
    'cancelled_by_buyer',
    'cancelled_by_seller',
    'cancelled_mutual',
    'cancelled_unpaid',
    'cancelled_admin',
] as const;

export const FAILED_ORDER_STATUSES = [
    'ghosted',
    'refunded',
    'pin_refused',
    ...CANCELLED_ORDER_STATUSES,
] as const;

export const TERMINAL_ORDER_STATUSES = [
    ...COMPLETED_ORDER_STATUSES,
    ...FAILED_ORDER_STATUSES,
] as const;

export function isCompletedOrderStatus(status?: string | null) {
    return Boolean(status && COMPLETED_ORDER_STATUSES.includes(status as typeof COMPLETED_ORDER_STATUSES[number]));
}

export function isCancelledOrderStatus(status?: string | null) {
    return Boolean(status && CANCELLED_ORDER_STATUSES.includes(status as typeof CANCELLED_ORDER_STATUSES[number]));
}

export function isTerminalOrderStatus(status?: string | null) {
    return Boolean(status && TERMINAL_ORDER_STATUSES.includes(status as typeof TERMINAL_ORDER_STATUSES[number]));
}

export function formatOrderStatusLabel(status?: string | null) {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ');
}

export function getOrderSurfaceStatus(orderStatus?: string | null, deliveryStatus?: string | null) {
    if (isCancelledOrderStatus(orderStatus)) return orderStatus ?? 'pending';
    if (isCompletedOrderStatus(orderStatus)) return 'completed';
    return deliveryStatus ?? orderStatus ?? 'pending';
}
