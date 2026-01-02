import { Nav, Footer } from "~/components/landing";
import { HomeSkeleton } from "~/components/skeletons/home-loading";
import { HydrateClient } from "~/trpc/server";

export default function Loading() {
    return (
        <HydrateClient>
            <Nav />
            <main className="min-h-screen">
                <HomeSkeleton />
            </main>
            <Footer />
        </HydrateClient>
    );
}
