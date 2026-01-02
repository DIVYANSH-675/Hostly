import {
  ECSClient,
  RunTaskCommand,
} from "@aws-sdk/client-ecs";
import {
  CloudWatchLogsClient,
  GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { env } from "~/env";
import { deployments } from "../db/schema";
import { envVarEntry } from "../api/routers/sites";

// Initialize AWS Clients
const ecsClient = new ECSClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

const logsClient = new CloudWatchLogsClient({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

type Deployment = typeof deployments.$inferSelect;

export async function requestBuild(
  deployment: Deployment,
  github_clone_url: string,
  sha?: string,
) {
  const envOverrides = [];

  const userEnvVars = envVarEntry
    .array()
    .safeParse(JSON.parse(deployment.environmentVariables ?? "[]"));

  if (userEnvVars.success) {
    for (const envVar of userEnvVars.data) {
      if (!envVar.key || envVar.key.trim() === "") {
        continue;
      }
      envOverrides.push({
        name: envVar.key,
        value: envVar.value,
      });
    }
  }

  envOverrides.push({ name: "HOSTLY_REPO_URL", value: github_clone_url });
  envOverrides.push({
    name: "HOSTLY_CALLBACK_URL",
    value: env.BUILDER_CALLBACK_URL,
  });
  envOverrides.push({
    name: "HOSTLY_DEPLOYMENT_ID",
    value: deployment.id,
  });
  envOverrides.push({
    name: "HOSTLY_S3_BUCKET",
    value: env.BUILD_BUCKET,
  });

  if (sha) {
    envOverrides.push({
      name: "HOSTLY_REPO_SHA",
      value: sha,
    });
  }

  const command = new RunTaskCommand({
    cluster: env.AWS_ECS_CLUSTER,
    taskDefinition: env.AWS_TASK_DEFINITION,
    launchType: "FARGATE",
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: [env.AWS_SUBNET_ID], // Assumes a single subnet for now
        securityGroups: [env.AWS_SECURITY_GROUP_ID],
        assignPublicIp: "ENABLED",
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: "builder", // IMPORTANT: Must match the container name in Task Def
          environment: envOverrides,
        },
      ],
    },
  });

  const response = await ecsClient.send(command);
  const task = response.tasks?.[0];

  if (!task || !task.taskArn) {
    throw new Error("Failed to start ECS task");
  }

  console.log("ECS Task started:", task.taskArn);

  // Extract task ID (the last part of the ARN)
  const taskId = task.taskArn.split("/").pop() || "";

  // Return [taskId, taskArn] to match the signature expected by sites.ts (mapped to [execution, operation])
  return [taskId, task.taskArn];
}

export async function getJobLogs(taskId: string) {
  try {
    // Use explicit env vars for log configuration
    const logGroupName = env.AWS_LOG_GROUP;
    const logStreamName = `${env.AWS_LOG_STREAM_PREFIX}/${taskId}`;

    const command = new GetLogEventsCommand({
      logGroupName: logGroupName,
      logStreamName: logStreamName,
      startFromHead: true,
    });

    const response = await logsClient.send(command);

    // sites.ts expects a tuple [entries] because GCP client returns [entries, request, response]
    return [(response.events || []).map(event => ({
      metadata: {
        timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      },
      data: event.message || ""
    }))];

  } catch (error: any) {
    console.error("Error fetching logs:", error?.message || error);
    // Return empty logs array in the expected format instead of empty array
    return [[]];
  }
}
