import { Suspense } from "react";
export const dynamic = "force-dynamic";
import { Nav, Footer } from "~/components/landing";
import { api, HydrateClient } from "~/trpc/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SubdomainManager } from "~/components/projects/subdomain-manager";
import { auth } from "~/server/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "~/components/ui/card";
import { ChevronLeft, ExternalLink } from "lucide-react";
import { DeploymentList } from "~/components/deployments/deployment-list";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { EnvManager } from "~/components/environment/env-manager";
import { RebuildButton } from "~/components/deployments/rebuild-button";
import { DeleteProjectButton } from "~/components/projects/delete-project-button";
import { SitePageSkeleton } from "~/components/skeletons/site-loading";
import { env } from "~/env";

// Main content component that handles data fetching
async function SiteContent({ siteId }: { siteId: string }) {
  // PARALLEL data fetching - both requests start simultaneously
  const [siteData, initialEnvVars] = await Promise.all([
    api.sites.get({ id: siteId }),
    api.sites.getSiteEnvVars({ siteId }),
  ]);

  if (!siteData) {
    return redirect("/404");
  }

  return (
    <div className="flex flex-col gap-8 flex-1">
      <div className="px-4 md:px-8">
        <div className="container mx-auto px-4 pt-24">
          <Link
            href="/"
            prefetch
            className="mb-6 flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-cyan-400 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to projects
          </Link>
          <div className="flex items-end justify-between">
            <div className="flex flex-col gap-4 text-balance">
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-4xl text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
                Manage {siteData.name}
              </h1>
              <p className="max-w-2xl text-muted-foreground text-lg">
                Manage your deployment settings, view logs, and configure
                domains for your application.
              </p>
            </div>
            <RebuildButton siteId={siteData.id} />
          </div>
        </div>
      </div>

      <div className="w-full flex-1 p-8">
        <div className="container mx-auto px-4">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="bg-white/5 border border-white/10 p-1">
              <TabsTrigger value="overview" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Overview</TabsTrigger>
              <TabsTrigger value="settings" className="data-[state=active]:bg-white/10 data-[state=active]:text-white">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <Card className="border-white/10 bg-white/5 backdrop-blur-sm shadow-xl">
                <CardHeader className="border-b border-white/5">
                  <CardTitle>Project Details</CardTitle>
                </CardHeader>
                <CardContent className="flex items-start justify-between pt-6">
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-muted-foreground">Repository</span>
                    {siteData.repository ? (
                      <a
                        className="flex items-center gap-2 hover:text-white transition-colors bg-black/20 px-3 py-1.5 rounded-full border border-white/5 w-fit"
                        href={`https://github.com/${siteData.repository}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <SiGithub className="h-4 w-4" />
                        {siteData.repository}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-sm">Manual upload</span>
                    )}
                  </div>
                  <div>
                    {siteData.subdomains && siteData.subdomains.length > 0 ? (
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Domains</span>
                        {siteData.subdomains.slice(0, 4).map((subdomain, index) => (
                          <a
                            key={index}
                            href={`http://${subdomain.subdomain}.${env.DEPLOY_DOMAIN}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex cursor-pointer items-center justify-end gap-2 rounded-md text-foreground hover:text-cyan-400 transition-colors"
                          >
                            {subdomain.subdomain}.{env.DEPLOY_DOMAIN}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-1">
                        <p className="text-sm text-muted-foreground">No domains configured</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <h3 className="text-xl font-medium px-1">Recent Deployments</h3>
                <DeploymentList siteId={siteId} initialSiteData={siteData} />
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <div className="grid gap-6">
                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardHeader className="border-b border-white/5">
                    <CardTitle>Domain Management</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <SubdomainManager siteId={siteData.id} subdomains={siteData.subdomains} />
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
                  <CardHeader className="border-b border-white/5">
                    <CardTitle>Environment Variables</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Add environment variables for your application.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <EnvManager siteId={siteData.id} initialEnvVars={initialEnvVars} />
                  </CardContent>
                </Card>

                <Card className="border-red-500/20 bg-red-500/5 backdrop-blur-sm">
                  <CardHeader className="border-b border-red-500/10">
                    <CardTitle className="text-red-400">Danger Zone</CardTitle>
                    <p className="text-sm text-red-400/70">
                      Irreversible actions that will permanently affect your project.
                    </p>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Delete this project</h4>
                        <p className="text-sm text-muted-foreground">
                          Once deleted, this project and all its data cannot be recovered.
                        </p>
                      </div>
                      <DeleteProjectButton siteId={siteData.id} siteName={siteData.name} />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session) {
    return redirect("/api/auth/signin");
  }

  const searchParamsAwaited = await searchParams;
  const siteId = searchParamsAwaited.id;

  if (!siteId || typeof siteId !== "string") {
    return redirect("/404");
  }

  return (
    <HydrateClient>
      <Nav />
      <main className="flex min-h-screen flex-col relative">
        <div className="absolute inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

        <Suspense fallback={<SitePageSkeleton />}>
          <SiteContent siteId={siteId} />
        </Suspense>
      </main>
      <Footer />
    </HydrateClient>
  );
}
