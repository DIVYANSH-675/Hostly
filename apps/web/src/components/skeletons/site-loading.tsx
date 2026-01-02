export function SitePageSkeleton() {
    return (
        <div className="flex flex-col gap-8 flex-1 animate-pulse">
            <div className="px-4 md:px-8">
                <div className="container mx-auto px-4 pt-24">
                    <div className="h-4 w-32 bg-white/10 rounded mb-6" />
                    <div className="flex items-end justify-between">
                        <div className="flex flex-col gap-4">
                            <div className="h-10 w-64 bg-white/10 rounded-lg" />
                            <div className="h-5 w-96 bg-white/5 rounded" />
                        </div>
                        <div className="h-10 w-24 bg-white/10 rounded-md" />
                    </div>
                </div>
            </div>
            <div className="w-full flex-1 p-8">
                <div className="container mx-auto px-4">
                    <div className="h-12 w-48 bg-white/10 rounded-lg mb-6" />
                    <div className="h-64 bg-white/5 border border-white/10 rounded-xl" />
                </div>
            </div>
        </div>
    );
}
