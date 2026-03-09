export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            {/* Filter bar skeleton */}
            <div className="bg-white border border-gray-200 p-4 space-y-4 mb-10 skeleton-pulse dark:bg-zinc-950 dark:border-zinc-800">
                <div className="h-10 bg-gray-100 dark:bg-zinc-900 rounded w-full" />
                <div className="flex gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="h-8 bg-gray-100 dark:bg-zinc-900 rounded-full w-24" />
                    ))}
                </div>
            </div>

            {/* Grid skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="skeleton-pulse space-y-3">
                        <div className="aspect-square bg-gray-100 dark:bg-zinc-900 rounded" />
                        <div className="h-4 bg-gray-100 dark:bg-zinc-900 rounded w-3/4" />
                        <div className="h-4 bg-gray-100 dark:bg-zinc-900 rounded w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    );
}
