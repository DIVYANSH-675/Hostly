"use client";
import { api } from "~/trpc/react";
import { DeploymentItem } from "./deployment-item";
import type { inferRouterOutputs } from "@trpc/server";
import { SitesRouter } from "~/server/api/routers/sites";
import { useRef, useEffect } from "react";

type RouterOutput = inferRouterOutputs<SitesRouter>;

interface DeploymentListProps {
  siteId: string;
  initialSiteData: RouterOutput["get"];
}

export const DeploymentList = ({
  siteId,
  initialSiteData,
}: DeploymentListProps) => {
  const { data: site } = api.sites.get.useQuery(
    {
      id: siteId,
    },
    {
      refetchInterval: (query) => {
        const data = query.state.data as RouterOutput["get"] | undefined;
        const deployments = data?.deployments ?? [];
        // Poll if new site (no deployments yet) or active build
        if (deployments.length === 0) return 3000;

        const hasActive = deployments.some(
          (deployment) =>
            deployment.status === "BUILDING" || deployment.status === "QUEUED",
        );

        return hasActive ? 3000 : false;
      },
      initialData: initialSiteData,
    },
  );

  const deployments = site?.deployments ?? [];

  return (
    <div className="grid gap-3">
      {deployments.map((deployment) => (
        <DeploymentItem key={deployment.id} deployment={deployment} />
      ))}
    </div>
  );
};
