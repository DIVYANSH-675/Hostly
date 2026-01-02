"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  GitBranch,
  GitCommit,
  MessageSquare,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { Skeleton } from "~/components/ui/skeleton";
import { cn } from "~/lib/utils";
import { ClientDate } from "~/components/shared/client-date";

const getStatusBadge = (status: string) => {
  const statusMap = {
    SUCCEEDED: {
      color: "bg-green-500/10 text-green-500 hover:bg-green-500/20",
      icon: CheckCircle2,
    },
    FAILED: {
      color: "bg-red-500/10 text-red-500 hover:bg-red-500/20",
      icon: AlertCircle,
    },
    BUILDING: {
      color: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20",
      icon: Clock,
    },
    QUEUED: {
      color: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
      icon: Clock,
    },
  };

  const defaultStatus = {
    color: "bg-gray-500/10 text-gray-500 hover:bg-gray-500/20",
    icon: Clock,
  };

  return statusMap[status as keyof typeof statusMap] || defaultStatus;
};

interface Deployment {
  id: string;
  status: "SUCCEEDED" | "FAILED" | "BUILDING" | "QUEUED";
  branch: string | null;
  createdAt: Date;
  commitHash: string | null;
  commitMessage: string | null;
}

export const DeploymentItem = ({ deployment }: { deployment: Deployment }) => {
  const { color, icon: StatusIcon } = getStatusBadge(deployment.status);

  const [animationRef] = useAutoAnimate({
    duration: 1,
  });

  const [isShowingLogs, setIsShowingLogs] = useState<boolean>(false);
  const isLive = deployment.status === "QUEUED" || deployment.status === "BUILDING";
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, isFetching } = api.sites.getDeploymentLogs.useQuery(
    {
      deploymentId: deployment.id,
    },
    {
      enabled: isShowingLogs,
      refetchInterval: isLive ? 500 : false, // Poll every 500ms for blazing fast live feedback
      staleTime: 0, // Always consider stale to refetch immediately
      refetchOnWindowFocus: false,
    },
  );

  // Instant auto-scroll to bottom of logs (no setTimeout)
  useEffect(() => {
    if (isShowingLogs && data && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [data, isShowingLogs]);

  return (
    <div
      ref={animationRef}
      className="group rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:shadow-lg hover:shadow-violet-500/5"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex w-full items-center justify-between">
          <div>
            <div className="flex items-center gap-4">
              <h3 className="font-mono font-medium">
                {deployment.id.slice(0, 8)}
              </h3>
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="flex cursor-pointer items-center text-sm text-muted-foreground hover:underline"
              >
                <GitBranch className="mr-2 h-4 w-4" />
                <span>{deployment.branch}</span>
              </a>
              <Badge className={`${color} flex items-center gap-1 capitalize`}>
                <StatusIcon className="h-3 w-3" />
                {deployment.status.toLowerCase()}
              </Badge>
            </div>
            <div>
              {deployment.commitMessage ? (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  {deployment.commitMessage}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No commit message
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Clock className="mr-2 h-4 w-4" />
              <ClientDate date={deployment.createdAt} />
            </div>
            <div className="flex items-center gap-1">
              <GitCommit className="mr-2 h-4 w-4" />
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                {deployment.commitHash?.slice(0, 7)}
              </code>
            </div>
          </div>
        </div>

        <Button onClick={() => setIsShowingLogs((prev) => !prev)}>
          {isShowingLogs ? "Hide Logs" : "Logs"}
        </Button>
      </div>

      {isShowingLogs && (
        <div
          ref={logsContainerRef}
          className="mt-4 max-h-[400px] overflow-y-auto rounded-md border border-white/5 bg-black/20 p-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
        >
          {/* Live indicator */}
          {isLive && (
            <div className="flex items-center gap-2 px-4 py-2 text-xs text-green-400 font-mono animate-pulse">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live logs streaming...
            </div>
          )}
          <ol className="grid w-full font-mono text-sm">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <li
                  key={index}
                  className="grid w-full grid-cols-12 gap-2 px-4 py-1"
                >
                  <div className="col-span-3">
                    <Skeleton className="h-4 w-32 bg-white/10" />
                  </div>
                  <div className="col-span-9">
                    <Skeleton className="h-4 w-full bg-white/10" />
                  </div>
                </li>
              ))
            ) : data?.length === 0 ? (
              <li className="px-4 text-muted-foreground">
                No logs available for this deployment.
              </li>
            ) : (
              <>
                {data?.map((log, index) => (
                  <li
                    key={index}
                    className={cn(
                      "grid w-full cursor-pointer grid-cols-12 px-4",
                      {
                        "bg-red-500/10 text-red-500":
                          log.message.toLowerCase().trim().startsWith("error"),
                      },
                    )}
                  >
                    <div className="col-span-3 text-xs text-muted-foreground">
                      <ClientDate date={log.timestamp} />
                    </div>
                    <div className="col-span-9 whitespace-pre-wrap break-words">
                      {log.message}
                    </div>
                  </li>
                ))}
                <div ref={logsEndRef} />
              </>
            )}
          </ol>
        </div>
      )}
    </div>
  );
};
