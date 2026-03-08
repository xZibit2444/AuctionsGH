import { cn } from '@/lib/utils';

interface SkeletonProps {
    className?: string;
}

export default function Skeleton({ className }: SkeletonProps) {
    return (
        <div
            className={cn(
                'skeleton-pulse rounded-xl bg-gray-200 dark:bg-gray-700',
                className
            )}
        />
    );
}

export function AuctionCardSkeleton() {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <Skeleton className="h-48 w-full rounded-none" />
            <div className="p-4 space-y-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-5 w-1/2" />
                <div className="flex justify-between">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
            </div>
        </div>
    );
}
