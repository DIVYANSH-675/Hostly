"use client";
import { Button } from "~/components/ui/button";
import { GitBranch, Globe, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import { SiteListItem } from "~/server/api/routers/sites";
import { env } from "~/env";

interface ProjectItemProps {
  project: SiteListItem;
}

export function ProjectItem({ project }: ProjectItemProps) {
  return (
    <div
      key={project.id}
      className="group grid grid-cols-12 rounded-xl border border-white/10 bg-white/5 p-4 text-card-foreground shadow-sm transition-all duration-200 ease-out hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5"
    >
      <div className="col-span-5 flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-white/10">
          <Globe className="h-5 w-5 text-violet-400" />
        </div>

        <div className="flex h-full flex-col items-start justify-center">
          <h2 className="font-semibold text-lg tracking-tight">{project.name}</h2>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <a
              className="group/link flex cursor-pointer items-center gap-1 text-sm text-muted-foreground hover:text-cyan-400 transition-colors"
              href={`http://${project.topSubdomain}.${env.NEXT_PUBLIC_DEPLOY_DOMAIN}`}
              target="_blank"
            >
              {project.topSubdomain}.{env.NEXT_PUBLIC_DEPLOY_DOMAIN}
            </a>
            {project.subdomainCount > 1 && (
              <span>+ {project.subdomainCount - 1}</span>
            )}
          </div>
        </div>
      </div>
      <div className="col-span-4 flex flex-col items-start justify-center pl-4">
        <a
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors"
          target="_blank"
          href={`https://github.com/${project.repository}`}
        >
          <SiGithub className="w-4 h-4" /> {project.repository}
        </a>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
          <GitBranch className="w-4 h-4" /> {project.branch}

          {project.deploymentStatus && (
            <div className="flex items-center gap-2 ml-2">
              {(project.deploymentStatus === "QUEUED" || project.deploymentStatus === "BUILDING") && (
                <span className="inline-flex items-center rounded-md bg-yellow-400/10 px-2 py-1 text-xs font-medium text-yellow-500 ring-1 ring-inset ring-yellow-400/20">
                  <span className="mr-1.5 flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                  </span>
                  {project.deploymentStatus === "BUILDING" ? "Building" : "Queued"}
                </span>
              )}
              {project.deploymentStatus === "FAILED" && (
                <span className="inline-flex items-center rounded-md bg-red-400/10 px-2 py-1 text-xs font-medium text-red-500 ring-1 ring-inset ring-red-400/20">
                  Error
                </span>
              )}
              {project.deploymentStatus === "SUCCEEDED" && (
                <span className="inline-flex items-center rounded-md bg-green-400/10 px-2 py-1 text-xs font-medium text-green-500 ring-1 ring-inset ring-green-400/20">
                  Ready
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="col-span-3 flex items-center justify-end">
        <ManageButton projectId={project.id} />
      </div>
    </div>
  );
}

function ManageButton({ projectId }: { projectId: string }) {
  const [isLoading, setIsLoading] = useState(false);

  return (
    <Button
      asChild
      variant="secondary"
      size="sm"
      className="bg-white/10 hover:bg-white/20 text-white border-none min-w-[80px]"
      onClick={() => setIsLoading(true)}
    >
      <Link href={`/site?id=${projectId}`} prefetch>
        {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Manage"}
      </Link>
    </Button>
  );
}
