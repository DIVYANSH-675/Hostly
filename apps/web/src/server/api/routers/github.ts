import { z } from "zod";
import { Octokit } from "@octokit/rest";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

const githubRepoSchema = z.object({
  id: z.number(),
  node_id: z.string(),
  full_name: z.string(),
  name: z.string(),
  private: z.boolean(),
  owner: z.object({
    login: z.string(),
    id: z.number(),
    avatar_url: z.string(),
  }),
  html_url: z.string(),
});

export type GithubRepoData = z.infer<typeof githubRepoSchema>;

export const githubRouter = createTRPCRouter({
  getUserInstallations: protectedProcedure.query(async ({ ctx }) => {
    const accessToken = ctx.session.user.accessToken;
    if (!accessToken) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "No GitHub access token found. Please reconnect your GitHub account.",
      });
    }

    const octokit = new Octokit({ auth: accessToken });

    try {
      const { data: installations } =
        await octokit.rest.apps.listInstallationsForAuthenticatedUser();
      return installations.installations;
    } catch (error: any) {
      console.error("Error fetching GitHub installations:", error);
      if (error.status === 401) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "GitHub token expired. Please sign out and sign in again.",
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to fetch GitHub installations.",
      });
    }
  }),

  getInstallationStatus: protectedProcedure.query(async ({ ctx }) => {
    const accessToken = ctx.session.user.accessToken;
    const installUrl = `https://github.com/apps/${process.env.GITHUB_APP_SLUG || "hostly-loval-dev"}/installations/new`;
    console.log("getInstallationStatus - accessToken exists:", !!accessToken);
    console.log("getInstallationStatus - accessToken length:", accessToken?.length || 0);

    if (!accessToken) {
      console.log("getInstallationStatus - No access token, returning not installed");
      return {
        installed: false,
        installUrl,
        error: {
          code: "TOKEN_MISSING",
          message: "No GitHub access token found. Please reconnect your GitHub account.",
        },
      };
    }

    const octokit = new Octokit({ auth: accessToken });

    try {
      const { data } =
        await octokit.rest.apps.listInstallationsForAuthenticatedUser();

      console.log("getInstallationStatus - Got installations:", data.total_count);

      const userInstallations = data.installations.filter(
        (installation) =>
          installation.account?.id ===
          parseInt(ctx.session.user.githubId ?? "0")
      );

      console.log("getInstallationStatus - User installations:", userInstallations.length);

      return {
        installed: userInstallations.length > 0,
        installUrl,
      };
    } catch (error: any) {
      console.error("getInstallationStatus - Error:", error?.status, error?.message);
      const status = error?.status;
      let message = "Failed to verify GitHub installation. Please try again.";
      let code = "GITHUB_ERROR";

      if (status === 401) {
        code = "TOKEN_INVALID";
        message = "GitHub rejected your token. Please sign out and sign in again.";
      } else if (status === 403) {
        code = "FORBIDDEN";
        message = "GitHub denied access or rate limited this request. Please try again soon.";
      }

      return {
        installed: false,
        installUrl,
        error: {
          code,
          status,
          message,
          details: error?.message,
        },
      };
    }
  }),

  getUserRepos: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(100),
      }),
    )
    .output(githubRepoSchema.array())
    .query(async ({ ctx, input }) => {
      const accessToken = ctx.session.user.accessToken;
      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "No GitHub access token found. Please reconnect your GitHub account.",
        });
      }

      const octokit = new Octokit({ auth: accessToken });

      // get installations
      let _installations;
      try {
        const response = await octokit.rest.apps.listInstallationsForAuthenticatedUser();
        _installations = response.data;
      } catch (error: any) {
        console.error("Error fetching GitHub installations:", error);
        if (error.status === 401) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "GitHub token expired. Please sign out and sign in again.",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch GitHub installations.",
        });
      }

      console.log(JSON.stringify(_installations, null, 2));

      const userInstallations =
        ctx.session.user.githubId !== undefined
          ? _installations.installations.filter(
            (installation) =>
              installation.account?.id ===
              parseInt(ctx.session.user.githubId ?? "0"),
          )
          : [];

      if (userInstallations.length === 0) {
        return [];
      }

      console.log(
        "Got installations",
        _installations,
        "for user",
        ctx.session.user.email,
        "filtered to",
        userInstallations,
      );

      // Create promises for each installation
      const reposPromises = userInstallations.map(async (installation) => {
        const installationOctokit = await ctx.githubApp.getInstallationOctokit(
          installation.id,
        );

        const { data: repos } =
          await installationOctokit.rest.apps.listReposAccessibleToInstallation(
            { per_page: input.limit },
          );

        return repos.repositories || [];
      });

      // Execute all promises in parallel
      const reposArrays = await Promise.all(reposPromises);

      // Flatten the array of arrays into a single array
      const allRepositories = reposArrays.flat();

      allRepositories.sort((a, b) => {
        return (
          new Date(b.updated_at ?? 0).getTime() -
          new Date(a.updated_at ?? 0).getTime()
        );
      });

      return allRepositories;
    }),

  getRepoDetailsByName: protectedProcedure
    .input(
      z.object({
        owner: z.string(),
        repo: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const accessToken = ctx.session.user.accessToken;
      if (!accessToken) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message:
            "No GitHub access token found. Please reconnect your GitHub account.",
        });
      }

      const octokit = new Octokit({ auth: accessToken });

      try {
        const { data: repoDetails } = await octokit.rest.repos.get({
          owner: input.owner,
          repo: input.repo,
        });

        const { data: branches } = await octokit.rest.repos.listBranches({
          owner: input.owner,
          repo: input.repo,
          per_page: 100,
        });

        return {
          ...repoDetails,
          branches: branches.map((branch) => branch.name),
        };
      } catch (error) {
        console.error(error);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Repository ${input.owner}/${input.repo} not found or you don't have access to it.`,
        });
      }
    }),
});
