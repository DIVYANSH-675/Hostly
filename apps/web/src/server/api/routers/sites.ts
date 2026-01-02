import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { sites, siteSubdomains, deployments } from "../../db/schema";
import { eq, and, desc } from "drizzle-orm";
import { env } from "process";
import { Octokit } from "@octokit/rest";
import { getJobLogs, requestBuild } from "~/server/utils/build";
import { TRPCError } from "@trpc/server";
import { SiteService } from "~/server/services/site-service";
// import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from "@aws-sdk/client-s3";

const subdomainSchema = z
  .string()
  .min(1)
  .max(63)
  .regex(/^[a-z0-9-]+$/);

export const envVarEntry = z.object({
  key: z.string(),
  value: z.string(),
});

const siteListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  repository: z.string(),
  // type: z.enum(["static", "server"]),

  branch: z.string(),
  deploymentStatus: z.enum(["QUEUED", "BUILDING", "SUCCEEDED", "FAILED", "NOT_FOUND"]).nullable().optional(),
  subdomainCount: z.number(),
  topSubdomain: z.string(),
});

export type SiteListItem = z.infer<typeof siteListItemSchema>;

const logSchema = z
  .object({
    timestamp: z.string(),
    message: z.string(),
  })
  .array();

export type Logs = z.infer<typeof logSchema>;

// --- HELPER: Centralized Deployment Trigger ---
// Removes code duplication from create, rebuild, editEnv
async function triggerDeploymentFlow(
  accessToken: string,
  siteId: string,
  repository: string,
  environmentVariables: string | null,
  branchInput?: string
) {
  // 1. Verify Repo Access
  const { octokit, repoDetails } = await SiteService.verifyRepoAccess(accessToken, repository);

  // 2. Determine Branch
  const branchName = branchInput || repoDetails.default_branch;

  // 3. Get Commit SHA & Message
  const { data: branchData } = await octokit.rest.repos.getBranch({
    owner: repoDetails.owner.login,
    repo: repoDetails.name,
    branch: branchName,
  });

  const commitHash = branchData.commit.sha;
  const commitMessage = branchData.commit.commit.message;

  // 4. Create deployment record and trigger build
  // Uses SiteService which saves to DB and starts ECS task
  const deployment = await SiteService.triggerDeployment(
    siteId,
    repository,
    accessToken,
    environmentVariables,
    branchName,
    commitHash,
    commitMessage
  );

  return deployment;
}

export const sitesRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z
          .string()
          .min(3)
          .max(63)
          .regex(/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/, "Invalid project name"),
        repository: z.string(), // TODO: We should handle repos that change name
        branch: z.string().optional(), // Branch to deploy (optional, will use default if not provided)
        environmentVariables: z.array(envVarEntry),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const accessToken = ctx.session.user.accessToken;

      if (!accessToken) {
        throw new Error(
          "No GitHub access token found. Please reconnect your GitHub account.",
        );
      }

      // Sanitize name for subdomain (defense in depth)
      const sanitizedName = input.name
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-") // Replace invalid chars with dash
        .replace(/-+/g, "-")          // Collapse multiple dashes
        .replace(/^-|-$/g, "");       // Remove leading/trailing dashes

      // 1. Create Site (Sync, Fast)
      const site = await ctx.db
        .insert(sites)
        .values({
          name: input.name,
          repository: input.repository,
          userId,
          environmentVariables: JSON.stringify(input.environmentVariables),
        })
        .returning();

      // 2. Create Subdomain (Sync, Fast)
      const subdomain = await ctx.db
        .insert(siteSubdomains)
        .values({
          siteId: site[0]!.id,
          subdomain: sanitizedName + "-" + site[0]!.id.slice(0, 7),
        })
        .returning();

      // 3. Trigger Deployment (Async, Fire-and-Forget)
      // We don't wait for this to finish so the UI redirects instantly
      (async () => {
        try {
          // ✅ Uses helper: removes code duplication
          const deployment = await triggerDeploymentFlow(
            accessToken,
            site[0]!.id,
            input.repository,
            site[0]!.environmentVariables,
            input.branch
          );

          // Link active deployment to site
          // NOTE: Redis is updated by callback/route.ts when build SUCCEEDS
          await ctx.db
            .update(sites)
            .set({
              activeDeploymentId: deployment.id,
            })
            .where(eq(sites.id, site[0]!.id))
            .execute();

          console.log(`[DEPLOY] Successfully initiated deployment for site ${site[0]!.id}`);
        } catch (error) {
          console.error(`[DEPLOY] Async deployment failed for site ${site[0]!.id}:`, error);
          // Optional: Update site status to error if we had a status field
        }
      })().catch(err => console.error("[DEPLOY] Fatal async error:", err));

      return site[0]!;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      let site = await ctx.db.query.sites.findFirst({
        where: and(eq(sites.userId, userId), eq(sites.id, input.id)),
        with: {
          subdomains: true,
          deployments: true,
        },
      });

      if (!site) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Site not found.",
        });
      }

      await Promise.all(
        site?.deployments.map(async (deployment) => {
          // if status is queued or building
          if (
            deployment.status === "QUEUED" ||
            deployment.status === "BUILDING"
          ) {
            // Static site build status check would go here if needed
          }
        }),
      );

      // refresh the site object
      site = await ctx.db.query.sites.findFirst({
        where: and(eq(sites.userId, userId), eq(sites.id, input.id)),
        with: {
          subdomains: true,
          deployments: true,
        },
      });

      site?.deployments.sort((a, b) => {
        return b.createdAt.getTime() - a.createdAt.getTime();
      });

      return site;
    }),

  list: protectedProcedure
    .output(siteListItemSchema.array())
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const userSites = await ctx.db.query.sites.findMany({
        where: eq(sites.userId, userId),
        with: {
          subdomains: true,
          // Only fetch the most recent deployment for branch info
          deployments: {
            limit: 1,
            orderBy: (deployments, { desc }) => [desc(deployments.createdAt)],
            columns: {
              branch: true,
              status: true,
            },
          },
        },
      });

      const data = userSites.map((site) => {
        const topSubdomain = site.subdomains[0]?.subdomain ?? "";
        const subdomainCount = site.subdomains.length;
        const latestDeployment = site.deployments[0];
        return {
          id: site.id,
          name: site.name,
          repository: site.repository ?? "",
          branch: latestDeployment?.branch ?? "main",
          deploymentStatus: latestDeployment?.status ?? null,
          topSubdomain,
          subdomainCount,
        };
      });

      return data;
    }),

  getDeploymentLogs: protectedProcedure
    .input(
      z.object({
        deploymentId: z.string(),
      }),
    )
    .output(logSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Efficiently fetch deployment with JOIN to verify ownership
      const deployment = await ctx.db.query.deployments.findFirst({
        where: eq(deployments.id, input.deploymentId),
        with: {
          site: true,
        },
      });

      if (!deployment || deployment.site.userId !== userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Deployment not found.",
        });
      }

      // Handle case where ECS task failed to start
      if (!deployment.aws_task_id || !deployment.aws_task_arn) {
        return [{
          timestamp: deployment.createdAt.toISOString(),
          message: "⚠️ Build task failed to start. Please try redeploying."
        }];
      }

      const isDeploymentDone =
        deployment.status !== "QUEUED" && deployment.status !== "BUILDING";

      if (isDeploymentDone && deployment.buildLogs) {
        console.log("Serving logs from cache for deployment", deployment.id);
        try {
          // Try parsing as JSON first (structured logs)
          return logSchema.parse(JSON.parse(deployment.buildLogs));
        } catch {
          // Fall back to raw text - convert to structured format
          const lines = deployment.buildLogs.split('\n').filter(line => line.trim());
          return lines.map((line, index) => ({
            timestamp: deployment.completedAt?.toISOString() ?? new Date().toISOString(),
            message: line
          }));
        }
      }

      // Fetch logs from CloudWatch
      const [logs] = await getJobLogs(deployment.aws_task_id);

      const dataUnsorted: {
        timestamp: Date;
        message: string;
      }[] = [];

      (logs || []).forEach((log: { metadata: { timestamp: Date | string }; data: string }) => {
        const safeParseMessage = z.string().safeParse(log.data);
        if (safeParseMessage.success) {
          let parsedTimestamp: Date | null = null;
          if (log.metadata.timestamp?.valueOf()) {
            const temp = log.metadata.timestamp;

            if (typeof temp === "string") {
              parsedTimestamp = new Date(temp);
            } else if (temp instanceof Date) {
              parsedTimestamp = temp;
            }

            if (parsedTimestamp) {
              dataUnsorted.push({
                timestamp: parsedTimestamp,
                message: safeParseMessage.data,
              });
            }
          }
        }
      });

      dataUnsorted.sort((a, b) => {
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      const dataSorted: Logs = dataUnsorted.map((log) => {
        return {
          timestamp: log.timestamp.toISOString(),
          message: log.message,
        };
      });

      // If no logs parsed yet, return a message
      if (dataSorted.length === 0) {
        return [{
          timestamp: new Date().toISOString(),
          message: "⏳ Waiting for logs... Build may still be starting."
        }];
      }

      // cache them if isDeploymentDone
      if (isDeploymentDone) {
        await ctx.db
          .update(deployments)
          .set({
            buildLogs: JSON.stringify(dataSorted),
          })
          .where(eq(deployments.id, input.deploymentId));
      }

      return dataSorted;
    }),

  addSubdomain: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        subdomain: subdomainSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const site = await SiteService.verifySiteOwnership(input.siteId, userId);

      // Check if subdomain already exists
      const existingSubdomain = await ctx.db.query.siteSubdomains.findFirst({
        where: eq(siteSubdomains.subdomain, input.subdomain),
      });

      if (existingSubdomain) {
        throw new Error("Subdomain already exists.");
      }

      // Create new subdomain
      const subdomain = await ctx.db
        .insert(siteSubdomains)
        .values({
          siteId: input.siteId,
          subdomain: input.subdomain,
        })
        .returning();

      if (site.activeDeploymentId) {
        // Since we are verifying ownership using SiteService which uses existing query, 
        // using the returned site object directly which might not have deployments populated fully 
        // if we change queries, but here verifySiteOwnership returns site with deployments (limit 1)
        // However activeDeploymentId refers to an ID, we need the deployment object to get hash.

        // Actually, site object returned from verifySiteOwnership has `deployments` relation.
        // We can optimize this by using the relation if activeDeploymentId matches?
        // But activeDeploymentId might not be the latest deployment.
        // Let's stick to querying it to be safe, or just use Redis logic as before.

        const activeDeployment = await ctx.db.query.deployments.findFirst({
          where: eq(deployments.id, site.activeDeploymentId),
        });

        if (activeDeployment) {
          const value = activeDeployment.commitHash!;
          await ctx.redis.set(`sha:${subdomain[0]!.subdomain}`, value);
        }
      }

      return subdomain[0]!;
    }),

  removeSubdomain: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        subdomain: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify site ownership
      await SiteService.verifySiteOwnership(input.siteId, userId);

      // Delete subdomain
      const deletedSubdomain = await ctx.db
        .delete(siteSubdomains)
        .where(
          and(
            eq(siteSubdomains.siteId, input.siteId),
            eq(siteSubdomains.subdomain, input.subdomain),
          ),
        )
        .returning();

      if (!deletedSubdomain.length) {
        throw new Error("Subdomain not found.");
      }

      // Remove from Redis if exists
      await ctx.redis.del(`sha:${input.subdomain}`);

      return deletedSubdomain[0]!;
    }),

  getSiteEnvVars: protectedProcedure
    .input(z.object({ siteId: z.string() }))
    .output(envVarEntry.array())
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      // Verify site ownership
      const site = await SiteService.verifySiteOwnership(input.siteId, userId);

      return envVarEntry
        .array()
        .parse(JSON.parse(site.environmentVariables ?? "[]"));
    }),

  editSiteEnvVars: protectedProcedure
    .input(
      z.object({
        siteId: z.string(),
        triggerBuild: z.boolean().default(false),
        environmentVariables: z.array(envVarEntry),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const site = await SiteService.verifySiteOwnership(input.siteId, userId);

      await ctx.db
        .update(sites)
        .set({
          environmentVariables: JSON.stringify(input.environmentVariables),
        })
        .where(eq(sites.id, input.siteId));

      // Fire-and-forget build trigger (don't block UI)
      if (input.triggerBuild) {
        const accessToken = ctx.session.user.accessToken!;
        const repository = site.repository!;
        const siteId = site.id;
        const envVarsJson = JSON.stringify(input.environmentVariables);

        // Background trigger - don't await
        triggerDeploymentFlow(
          accessToken,
          siteId,
          repository,
          envVarsJson
        ).catch(err => console.error("[ENV-TRIGGER] Deployment flow failed:", err));
      }

      return { success: true };
    }),

  // Rebuild a site by triggering a new deployment
  rebuild: protectedProcedure
    .input(z.object({ siteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const site = await SiteService.verifySiteOwnership(input.siteId, userId);

      // ✅ Uses helper: removes code duplication
      const deployment = await triggerDeploymentFlow(
        ctx.session.user.accessToken!,
        site.id,
        site.repository!,
        site.environmentVariables
      );

      return { success: true, deploymentId: deployment.id };
    }),

  // Delete a site and all associated resources
  delete: protectedProcedure
    .input(z.object({ siteId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const site = await ctx.db.query.sites.findFirst({
        where: and(
          eq(sites.id, input.siteId),
          eq(sites.userId, ctx.session.user.id)
        ),
        with: {
          subdomains: true,
          deployments: true,
        },
      });

      if (!site) {
        throw new Error("Site not found or you don't have access to it.");
      }

      // 1. Gather data for cleanup
      const commitHashes = [...new Set(
        site.deployments
          .map(d => d.commitHash)
          .filter((hash): hash is string => hash !== null)
      )];

      const subdomains = site.subdomains.map(s => s.subdomain);

      // 2. Delete from database IMMEDIATELLY (The "Business Transaction")
      // Delete deployments first
      await ctx.db.delete(deployments).where(eq(deployments.siteId, site.id));
      // Delete subdomains
      await ctx.db.delete(siteSubdomains).where(eq(siteSubdomains.siteId, site.id));
      // Delete site
      await ctx.db.delete(sites).where(eq(sites.id, site.id));

      console.log(`[DELETE] Site ${site.name} (${site.id}) deleted from DB successfully`);

      // 3. Fire-and-forget background cleanup (S3 & Redis)
      // We do NOT await this, allowing the UI to return instantly
      (async () => {
        try {
          // Redis Cleanup
          for (const subdomain of subdomains) {
            try {
              await ctx.redis.del(`sha:${subdomain}`);
            } catch (err) {
              console.error(`[BG-DELETE] Failed to cleanup Redis for ${subdomain}:`, err);
            }
          }

          // S3 Cleanup
          // S3 Cleanup Logic Temporarily Disabled for Build Fix
          // const s3Client = new S3Client({ ... });
          // const S3_BUCKET = process.env.BUILD_BUCKET;
          // if (S3_BUCKET) { ... }
        } catch (err) {
          console.error("[BG-DELETE] Global cleanup error:", err);
        }
      })().catch(err => console.error("[BG-DELETE] Fatal error:", err));

      return { success: true, deletedSiteId: site.id };
    }),
});

export type SitesRouter = typeof sitesRouter;
