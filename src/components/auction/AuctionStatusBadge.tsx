import type { AuctionStatus } from '@/types/database';

const statusConfig: Record<AuctionStatus, { label: string; className: string }> = {
    active: { label: 'LIVE', className: 'bg-black text-white' },
    draft: { label: 'DRAFT', className: 'bg-gray-100 text-gray-500' },
    ended: { label: 'ENDED', className: 'bg-gray-100 text-gray-500' },
    sold: { label: 'SOLD', className: 'bg-gray-900 text-white' },
    cancelled: { label: 'CANCELLED', className: 'bg-gray-100 text-gray-400' },
};

interface AuctionStatusBadgeProps {
    status: AuctionStatus;
}

export default function AuctionStatusBadge({ status }: AuctionStatusBadgeProps) {
    const config = statusConfig[status];
    return (
        <span className={`inline-block text-[10px] font-black tracking-widest uppercase px-2 py-0.5 ${config.className}`}>
            {config.label}
        </span>
    );
}
