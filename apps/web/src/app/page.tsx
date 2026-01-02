import { Suspense } from "react";
export const dynamic = "force-dynamic";
import { api, HydrateClient } from "~/trpc/server";
import { LandingPage, Nav, Footer } from "~/components/landing";
import { auth } from "~/server/auth";
import { RepositoryList } from "~/components/projects/repository-list";
import { env } from "~/env";
import Link from "next/link";

import { Button } from "~/components/ui/button";
import { ProjectItem } from "~/components/projects/project-item";
import { GitHubInstallPrompt } from "~/components/projects/github-install-prompt";
import { HomeSkeleton, DeploySkeleton } from "~/components/skeletons/home-loading";

async function Deploy({ first }: { first: boolean }) {
  const installStatus = await api.github.getInstallationStatus();

  if (!installStatus.installed) {
    return (
      <div className="flex flex-col gap-8">
        <div className="container mx-auto flex flex-col gap-4 text-balance px-4 md:px-8 pt-32 text-center items-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-4xl">
            Deploy your {first ? "first" : ""} project{" "}
            <span className="relative">
              <span className="relative z-10 bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">instantly.</span>
            </span>
          </h1>
          <p className="max-w-2xl text-muted-foreground text-lg">
            {`Connect your GitHub repository and we'll automatically build, deploy, and scale your applications.`}
          </p>
        </div>
        <div className="container mx-auto max-w-3xl py-12">
          <GitHubInstallPrompt installUrl={installStatus.installUrl} />
        </div>
      </div>
    );
  }

  const repos = await api.github.getUserRepos({ limit: 30 });

  return (
    <div className="flex flex-col gap-8">
      <div className="container mx-auto flex flex-col gap-4 text-balance px-4 md:px-8 pt-32 text-center items-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-4xl">
          Deploy your {first ? "first" : ""} project{" "}
          <span className="relative">
            <span className="relative z-10 bg-gradient-to-r from-violet-500 to-cyan-500 bg-clip-text text-transparent">instantly.</span>
          </span>
        </h1>
        <p className="max-w-2xl text-muted-foreground text-lg">
          {`Connect your GitHub repository and we'll automatically build, deploy, and scale your applications.`}
        </p>
      </div>
      <div className="container mx-auto max-w-4xl px-4 pb-16">
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl">
          <RepositoryList initialRepos={repos} appLink={env.GITHUB_APP_URL} />
        </div>
      </div>
    </div>
  );
}

async function Home({ newMode = false }: { newMode?: boolean }) {
  const sites = await api.sites.list();

  if (sites.length === 0 || newMode) {
    return <Deploy first={sites.length === 0} />;
  }

  return (
    <div className="flex flex-col gap-8 relative">
      <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

      <div className="px-8">
        <div className="container mx-auto flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between px-4 pt-32">
          <div className="flex flex-col gap-4 text-balance">
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Your Projects
            </h1>
            <p className="max-w-2xl text-muted-foreground">
              Manage all your deployed applications in one place.
            </p>
          </div>
          <DeployNewProjectButton />
        </div>
      </div>

      <div className="container mx-auto px-12 pb-16">
        <div className="flex flex-col gap-8 lg:flex-row">
          <div className="flex-1">
            <h3 className="mb-4 text-lg font-semibold text-muted-foreground">From GitHub</h3>
            <div className="grid gap-4">
              {sites.map((site) => (
                <ProjectItem project={site} key={site.id} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { DeployNewProjectButton } from "~/components/deployments/deploy-new-project-button";

async function AsyncPageContent({
  newMode
}: {
  newMode: boolean
}) {
  const session = await auth();

  if (!session || !session.user) {
    return (
      <HydrateClient>
        <LandingPage />
      </HydrateClient>
    );
  }

  return <Home newMode={newMode} />;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParamsAwaited = await searchParams;
  const newMode = searchParamsAwaited.deploy === "true";

  // Note: We await searchParams first (fast), then render the shell.
  // The slow auth check happens inside AsyncPageContent, wrapped in Suspense.

  return (
    <HydrateClient>
      <Nav />
      <main className="min-h-screen">
        <Suspense fallback={newMode ? <DeploySkeleton /> : <HomeSkeleton />}>
          <AsyncPageContent newMode={newMode} />
        </Suspense>
      </main>
      <Footer />
    </HydrateClient>
  );
}
