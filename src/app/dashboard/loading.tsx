export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 sm:pb-10 skeleton-pulse">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="space-y-2">
                    <div className="h-7 bg-gray-100 rounded w-32" />
                    <div className="h-4 bg-gray-100 rounded w-40" />
                </div>
                <div className="h-9 w-9 bg-gray-100 rounded" />
            </div>

            {/* Banner */}
            <div className="h-16 bg-gray-100 rounded mb-8 w-full" />

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200 mb-6">
                <div className="h-8 bg-gray-100 rounded w-20" />
                <div className="h-8 bg-gray-100 rounded w-20" />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-20 bg-gray-100 rounded" />
                ))}
            </div>

            {/* Table rows */}
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-16 bg-gray-100 rounded" />
                ))}
            </div>
        </div>
    );
}
