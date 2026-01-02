import { NextRequest, NextResponse } from "next/server";
import { Webhooks } from "@octokit/webhooks";
import { env } from "~/env";
import { db } from "~/server/db/client";
import { eq } from "drizzle-orm";
import { sites, accounts } from "~/server/db/schema";
import { SiteService } from "~/server/services/site-service";

const webhooks = new Webhooks({
  secret: env.GITHUB_WEBHOOK_SECRET,
});

export async function POST(request: NextRequest) {
  const signature = request.headers.get("x-hub-signature-256");
  const id = request.headers.get("x-github-delivery");
  const event = request.headers.get("x-github-event");

  if (!signature || !id || !event) {
    return new Response("Bad Request", { status: 400 });
  }

  const body = await request.text();
  if (!(await webhooks.verify(body, signature))) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (event === "push") {
    const payload = JSON.parse(body);
    const repoName = payload.repository.full_name;
    const pushedBranch = payload.ref.split("/").pop();
    const defaultBranch = payload.repository.default_branch;

    // Only auto-deploy if pushing to default branch (usually 'main' or 'master')
    if (pushedBranch === defaultBranch) {
      console.log(`[WEBHOOK] Received push to ${repoName} on ${pushedBranch}`);

      // Find all sites linked to this repo
      const linkedSites = await db.query.sites.findMany({
        where: eq(sites.repository, repoName),
      });

      for (const site of linkedSites) {
        try {
          const commitHash = payload.after;
          const commitMessage = payload.commits[payload.commits.length - 1]?.message || "Auto-deploy via Webhook";

          // Create the deployment record
          const deployment = await SiteService.createDeploymentRecord(
            site.id,
            pushedBranch,
            commitHash,
            site.environmentVariables,
            commitMessage
          );

          // Get the user's GitHub access token to clone private repos
          const userAccount = await db.query.accounts.findFirst({
            where: (accountsTable, { eq, and }) =>
              and(
                eq(accountsTable.userId, site.userId),
                eq(accountsTable.provider, "github")
              )
          });

          if (userAccount?.access_token && site.repository) {
            SiteService.triggerBuildAsync(deployment, site.repository, userAccount.access_token);
            console.log(`[WEBHOOK] Triggered deployment ${deployment.id} for site ${site.name}`);
          } else {
            console.error(`[WEBHOOK] No access token found for site owner ${site.userId}`);
          }

        } catch (err) {
          console.error(`[WEBHOOK] Failed to deploy site ${site.id}`, err);
        }
      }
    }
  }

  return new Response("OK", { status: 200 });
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
