export default function Loading() {
    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-pulse">
            {/* Header */}
            <div className="h-7 bg-gray-100 rounded w-28 mb-6" />

            {/* Order rows */}
            <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="border border-gray-200 p-4 space-y-3">
                        <div className="flex justify-between">
                            <div className="h-5 bg-gray-100 rounded w-48" />
                            <div className="h-5 bg-gray-100 rounded w-20" />
                        </div>
                        <div className="h-4 bg-gray-100 rounded w-32" />
                    </div>
                ))}
            </div>
        </div>
    );
}
