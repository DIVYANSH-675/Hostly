import { ProjectListSkeleton } from "~/components/projects/project-skeleton";

export function DeploySkeleton() {
    return (
        <div className="flex flex-col gap-8 animate-pulse">
            <div className="container mx-auto flex flex-col gap-4 px-8 pt-32 text-center items-center">
                <div className="h-12 w-96 bg-white/10 rounded-lg" />
                <div className="h-6 w-64 bg-white/5 rounded" />
            </div>
            <div className="container mx-auto max-w-4xl px-4 pb-16">
                <div className="h-96 rounded-2xl border border-white/10 bg-white/5" />
            </div>
        </div>
    );
}

export function HomeSkeleton() {
    return (
        <div className="flex flex-col gap-8 relative">
            <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="px-8">
                <div className="container mx-auto flex items-end justify-between px-4 pt-32">
                    <div className="flex flex-col gap-4">
                        <div className="h-10 w-48 bg-white/10 rounded-lg animate-pulse" />
                        <div className="h-5 w-72 bg-white/5 rounded animate-pulse" />
                    </div>
                    <div className="h-10 w-40 bg-white/10 rounded-full animate-pulse" />
                </div>
            </div>
            <div className="container mx-auto px-12 pb-16">
                <div className="flex flex-col gap-8 lg:flex-row">
                    <div className="flex-1">
                        <div className="h-6 w-32 bg-white/10 rounded mb-4 animate-pulse" />
                        <ProjectListSkeleton count={3} />
                    </div>
                    <div className="w-full lg:w-[380px]">
                        <div className="h-6 w-32 bg-white/10 rounded mb-4 animate-pulse" />
                        <div className="h-64 rounded-xl border border-white/10 bg-white/5 animate-pulse" />
                    </div>
                </div>
            </div>
        </div>
    );
}
