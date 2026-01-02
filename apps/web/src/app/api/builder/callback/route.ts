import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "~/server/db/client";
import { deployments, sites, siteSubdomains } from "~/server/db/schema";
import { redis } from "~/server/utils/redis";
import { env } from "~/env";

const bodySchema = z.object({
  status: z.string(),
  deployment_id: z.string().optional(),
  exit_code: z.number().optional(),
  logs: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const parsedBody = bodySchema.parse(await request.json());

    const deployment_id = parsedBody.deployment_id;

    if (!deployment_id) {
      return NextResponse.json(
        { error: "Invalid input", details: "Missing deployment_id" },
        { status: 400 },
      );
    }

    const deployment = await db.query.deployments.findFirst({
      where: eq(deployments.id, deployment_id),
      with: {
        site: true,
      },
    });

    // Use AWS identifiers now
    if (!deployment?.aws_task_arn) {
      return NextResponse.json(
        { error: "Deployment not found", details: "Invalid deployment_id" },
        { status: 404 },
      );
    }

    // Static Site Build Logic
    // const jobStatus = await getJobStatus(deployment?.aws_task_arn);

    if (parsedBody.status !== "started") {
      // Build finished (either success or failure)
      try {
        console.log("[JOB] Job finished with status:", parsedBody.status);

        // We TRUST the callback status mostly, but could verify with jobStatus if needed.
        if (parsedBody.status === "success" || parsedBody.status === "SUCCEEDED") {
          const updatedDeployment = await db
            .update(deployments)
            .set({
              status: "SUCCEEDED",
              completedAt: new Date(),
              buildLogs: parsedBody.logs ?? null,
            })
            .where(eq(deployments.id, deployment.id))
            .returning();

          console.log("Updated deployment", updatedDeployment);

          // set this as active deployment
          await db
            .update(sites)
            .set({
              activeDeploymentId: deployment.id,
            })
            .where(eq(sites.id, deployment.siteId));

          // get subdomains for this site and set them all to the new commit hash
          const subdomains = await db.query.siteSubdomains.findMany({
            where: eq(siteSubdomains.siteId, deployment.siteId),
          });

          for (const subdomain of subdomains) {
            if (deployment.commitHash && subdomain?.subdomain) {
              await redis.set(
                `sha:${subdomain.subdomain}`,
                deployment.commitHash,
              );
            }
          }
        } else {
          // Failed
          console.log("[JOB] Job flagged as failed by callback");
          await db
            .update(deployments)
            .set({
              status: "FAILED",
              completedAt: new Date(),
              buildLogs: parsedBody.logs ?? null,
            })
            .where(eq(deployments.id, deployment.id));
        }

      } catch (err) {
        console.log("[JOB] Error processing success/fail state", err);
        await db
          .update(deployments)
          .set({
            status: "FAILED",
            completedAt: new Date(),
            buildLogs: parsedBody.logs ?? "Error processing callback",
          })
          .where(eq(deployments.id, deployment.id));
      }
    } else {
      // Job Started
      await db
        .update(deployments)
        .set({ status: "BUILDING", startedAt: new Date() })
        .where(eq(deployments.id, deployment.id));

      return NextResponse.json({ message: "Job is running" });
    }

    return NextResponse.json({ message: "POST request received" });
  } catch (error) {
    console.error("[CALLBACK] Unhandled error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
