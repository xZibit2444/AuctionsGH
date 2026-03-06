export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-[60vh] animate-in fade-in duration-500">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-gray-200 border-t-black rounded-full animate-spin" />
                <p className="text-sm font-black text-black uppercase tracking-widest animate-pulse">
                    Loading
                </p>
            </div>
        </div>
    );
}
