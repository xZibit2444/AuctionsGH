export default function Loading() {
    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-pulse">
            <div className="h-7 bg-gray-100 rounded w-24 mb-8" />
            <div className="space-y-6">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-32" />
                        <div className="h-10 bg-gray-100 rounded w-full" />
                    </div>
                ))}
                <div className="h-11 bg-gray-100 rounded w-32 mt-4" />
            </div>
        </div>
    );
}
