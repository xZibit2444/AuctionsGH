export default function Loading() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                {/* Image */}
                <div className="aspect-square bg-gray-100 rounded" />

                {/* Details */}
                <div className="space-y-4">
                    <div className="h-3 bg-gray-100 rounded w-24" />
                    <div className="h-8 bg-gray-100 rounded w-3/4" />
                    <div className="h-5 bg-gray-100 rounded w-1/3" />

                    <div className="border-t border-gray-200 pt-4 space-y-3">
                        <div className="h-4 bg-gray-100 rounded w-full" />
                        <div className="h-4 bg-gray-100 rounded w-5/6" />
                        <div className="h-4 bg-gray-100 rounded w-4/6" />
                    </div>

                    {/* Bid box */}
                    <div className="border border-gray-200 p-5 mt-4 space-y-4">
                        <div className="flex justify-between">
                            <div className="h-5 bg-gray-100 rounded w-28" />
                            <div className="h-7 bg-gray-100 rounded w-20" />
                        </div>
                        <div className="h-12 bg-gray-100 rounded w-full" />
                        <div className="h-12 bg-gray-100 rounded w-full" />
                    </div>
                </div>
            </div>
        </div>
    );
}
