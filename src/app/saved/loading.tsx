export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
            <div className="h-7 bg-gray-100 rounded w-36 mb-8" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="space-y-3">
                        <div className="aspect-square bg-gray-100 rounded" />
                        <div className="h-4 bg-gray-100 rounded w-3/4" />
                        <div className="h-4 bg-gray-100 rounded w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    );
}
