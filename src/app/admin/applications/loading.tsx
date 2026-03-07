export default function Loading() {
    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-pulse">
            <div className="h-7 bg-gray-100 rounded w-52 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-72 mb-8" />

            {/* Tab strip */}
            <div className="flex gap-2 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-8 bg-gray-100 rounded w-20" />
                ))}
            </div>

            {/* Table rows */}
            <div className="border border-gray-200 divide-y divide-gray-200">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4">
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-100 rounded w-40" />
                            <div className="h-3 bg-gray-100 rounded w-24" />
                        </div>
                        <div className="h-8 bg-gray-100 rounded w-20" />
                    </div>
                ))}
            </div>
        </div>
    );
}
