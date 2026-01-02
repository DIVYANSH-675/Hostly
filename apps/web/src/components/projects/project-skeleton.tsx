"use client";

import { Skeleton } from "~/components/ui/skeleton";

export function ProjectItemSkeleton() {
    return (
        <div className="grid grid-cols-12 rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse">
            <div className="col-span-5 flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex flex-col gap-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-4 w-48" />
                </div>
            </div>
            <div className="col-span-4 flex flex-col justify-center gap-2 pl-4">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-20" />
            </div>
            <div className="col-span-3 flex items-center justify-end">
                <Skeleton className="h-9 w-20 rounded-md" />
            </div>
        </div>
    );
}

export function ProjectListSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="grid gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <ProjectItemSkeleton key={i} />
            ))}
        </div>
    );
}
