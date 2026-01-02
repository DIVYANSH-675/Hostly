"use client";
import { Input } from "~/components/ui/input";
import type { GithubRepoData } from "~/server/api/routers/github";
import { Button } from "~/components/ui/button";

import { ArrowRight, Globe, Lock, Search } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { api } from "~/trpc/react";
import { SiGithub } from "@icons-pack/react-simple-icons";
import NextImage from "next/image";
import { DeployButton } from "~/components/deployments/deploy-button";

interface RepositoryListProps {
  initialRepos: GithubRepoData[];
  appLink: string;
}

export function RepositoryList({ initialRepos, appLink }: RepositoryListProps) {
  const [search, setSearch] = useState("");

  const { data: repos } = api.github.getUserRepos.useQuery(
    {
      limit: 100,
    },
    {
      initialData: initialRepos,
      staleTime: 60000, // Cache for 60 seconds
    },
  );

  const filteredRepos = useMemo(() => {
    return repos.filter((repo) => {
      return repo.full_name.toLowerCase().includes(search.toLowerCase());
    });
  }, [repos, search]);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-semibold tracking-tight text-center">
        Import a Git Repository
      </h2>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9 bg-black/20 border-white/10 focus:border-violet-500/50 transition-colors"
            placeholder="Search repositories..."
            onChange={(e) => setSearch(e.target.value)}
            disabled={repos.length === 0}
          />
        </div>
      </div>

      {repos.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/10 p-12 text-center">
          <SiGithub className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-xl font-medium">No repositories found</h3>
          <p className="mb-6 text-muted-foreground">
            Connect your GitHub account to import and deploy your repositories.
          </p>
          <Button asChild variant="default" className="bg-white text-black hover:bg-gray-200">
            <a href={appLink} className="flex items-center gap-2">
              Configure GitHub
              <ArrowRight className="-rotate-45" />
            </a>
          </Button>
        </div>
      ) : (
        <>
          <div className="max-h-96 divide-y divide-white/5 overflow-auto rounded-lg border border-white/10 bg-black/20">
            {filteredRepos.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <NextImage
                    src={repo.owner.avatar_url}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full ring-2 ring-white/10"
                  />
                  <div className="flex items-center gap-2">
                    {repo.private ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="hidden md:block font-medium text-sm">{repo.full_name}</span>
                    <span className="max-w-[16ch] truncate md:hidden text-sm">
                      {repo.name}
                    </span>
                  </div>
                </div>
                <DeployButton owner={repo.owner.login} repo={repo.name} />
              </div>
            ))}
          </div>
          <div className="w-fit text-muted-foreground mx-auto text-sm">
            {"Don't see a repository? "}
            <Button
              asChild
              variant="link"
              className="inline-flex gap-0 p-0 text-sm text-violet-400 hover:text-violet-300 underline"
            >
              <a href={appLink}>
                Reconfigure GitHub
                <ArrowRight className="w-3 h-3 ml-1 -rotate-45" />
              </a>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
