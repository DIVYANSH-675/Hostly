
import { db } from "../db/client";
import { deployments, sites, siteSubdomains } from "../db/schema";
import { and, desc, eq } from "drizzle-orm";
import { Octokit } from "@octokit/rest";
import { requestBuild } from "../utils/build";

export class SiteService {
    /**
     * Verify if a user owns a site and return the site object.
     */
    static async verifySiteOwnership(siteId: string, userId: string) {
        const site = await db.query.sites.findFirst({
            where: and(eq(sites.userId, userId), eq(sites.id, siteId)),
            with: {
                deployments: { limit: 1, orderBy: [desc(deployments.createdAt)] },
                subdomains: true,
            },
        });

        if (!site) {
            throw new Error("Site not found or you don't have access to it.");
        }

        return site;
    }

    /**
     * Verify if a GitHub user has access to a repository.
     */
    static async verifyRepoAccess(accessToken: string, repository: string) {
        const octokit = new Octokit({ auth: accessToken });
        const [owner, repo] = repository.split("/");

        if (!owner || !repo) {
            throw new Error("Invalid repository format.");
        }

        try {
            const { data } = await octokit.rest.repos.get({
                owner: owner,
                repo: repo,
            });

            if (!data) throw new Error("Repository not found.");

            return { octokit, repoDetails: data };
        } catch (error) {
            console.error(error);
            throw new Error("Repository not found or you don't have access to it.");
        }
    }

    /**
     * Create a deployment record (synchronous, fast).
     */
    static async createDeploymentRecord(
        siteId: string,
        branch: string,
        commitHash: string,
        envVars: string | null,
        commitMessage: string = ""
    ) {
        const deployment = await db
            .insert(deployments)
            .values({
                siteId: siteId,
                status: "QUEUED",
                branch: branch,
                commitHash: commitHash,
                commitMessage: commitMessage,
                buildLogs: null,
                environmentVariables: envVars,
            })
            .returning();

        if (!deployment[0]) throw new Error("Failed to create deployment record.");
        return deployment[0]!;
    }

    /**
     * Trigger AWS ECS build and update deployment record (fire-and-forget).
     * This function does NOT block the caller.
     */
    static triggerBuildAsync(
        deployment: typeof deployments.$inferSelect,
        repository: string,
        accessToken: string
    ) {
        // Fire-and-forget: wrap in IIFE and don't await
        (async () => {
            try {
                const cloneUrl = `https://x-access-token:${accessToken}@github.com/${repository}.git`;

                const [execution, operation] = await requestBuild(
                    deployment,
                    cloneUrl,
                    deployment.commitHash || ""
                );

                await db
                    .update(deployments)
                    .set({
                        aws_task_arn: operation,
                        aws_task_id: execution,
                    })
                    .where(eq(deployments.id, deployment.id));

                console.log(`[BUILD] Triggered ECS task for deployment ${deployment.id}`);
            } catch (err) {
                console.error(`[BUILD] Failed to trigger ECS task for deployment ${deployment.id}:`, err);
                // Update deployment status to FAILED
                await db
                    .update(deployments)
                    .set({ status: "FAILED" })
                    .where(eq(deployments.id, deployment.id))
                    .catch(() => { });
            }
        })().catch(err => console.error("[BUILD] Fatal error:", err));
    }

    /**
     * Create a deployment record and trigger an AWS build (legacy, still awaits).
     * @deprecated Use createDeploymentRecord + triggerBuildAsync for non-blocking behavior.
     */
    static async triggerDeployment(
        siteId: string,
        repository: string,
        accessToken: string,
        envVars: string | null,
        branch: string,
        commitHash: string,
        commitMessage: string = ""
    ) {
        const deployment = await this.createDeploymentRecord(siteId, branch, commitHash, envVars, commitMessage);
        this.triggerBuildAsync(deployment, repository, accessToken);
        return deployment;
    }
}
