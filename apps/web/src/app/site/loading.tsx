import { Nav, Footer } from "~/components/landing";
import { SitePageSkeleton } from "~/components/skeletons/site-loading";
import { HydrateClient } from "~/trpc/server";

export default function Loading() {
    return (
        <HydrateClient>
            <Nav />
            <main className="min-h-screen">
                <SitePageSkeleton />
            </main>
            <Footer />
        </HydrateClient>
    );
}
