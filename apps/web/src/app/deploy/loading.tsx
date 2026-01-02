import { Nav, Footer } from "~/components/landing";
import { HydrateClient } from "~/trpc/server";

// Loading skeleton for deploy form
function DeployFormSkeleton() {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm animate-pulse">
            <div className="bg-gradient-to-br from-violet-500/10 to-cyan-500/10 -m-8 mb-8 p-8 border-b border-white/5">
                <div className="h-8 w-48 bg-white/10 rounded-lg mb-4" />
                <div className="h-10 w-64 bg-white/5 rounded-full" />
            </div>
            <div className="space-y-6">
                <div className="h-6 w-32 bg-white/10 rounded mb-4" />
                <div className="h-11 bg-white/5 rounded-md" />
                <div className="h-11 bg-white/5 rounded-md" />
                <div className="h-32 bg-white/5 rounded-md" />
            </div>
            <div className="flex justify-end gap-4 pt-8 mt-8 border-t border-white/5">
                <div className="h-10 w-20 bg-white/5 rounded-md" />
                <div className="h-10 w-28 bg-white/10 rounded-md" />
            </div>
        </div>
    );
}

export default function Loading() {
    return (
        <HydrateClient>
            <main className="flex min-h-screen flex-col relative">
                <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
                <Nav />
                <div className="mx-auto w-full max-w-3xl flex-grow px-4 py-16">
                    <div className="w-full">
                        <DeployFormSkeleton />
                    </div>
                </div>
                <Footer />
            </main>
        </HydrateClient>
    );
}
