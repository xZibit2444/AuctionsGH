export default function Loading() {
    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 skeleton-pulse">
            <div className="h-8 bg-gray-100 rounded w-56 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-72 mb-10" />
            <div className="space-y-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-36" />
                        <div className="h-10 bg-gray-100 rounded w-full" />
                    </div>
                ))}
                <div className="h-11 bg-gray-100 rounded w-40 mt-4" />
            </div>
        </div>
    );
}
