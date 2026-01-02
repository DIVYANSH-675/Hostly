import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),

    GITHUB_ID: z.string(),
    GITHUB_APP_ID: z.string(),
    GITHUB_SECRET: z.string(),
    GITHUB_PRIVATE_KEY: z.string(),
    GITHUB_APP_URL: z.string().url(),
    GITHUB_APP_SLUG: z.string().default("hostly-loval-dev"),
    GITHUB_WEBHOOK_SECRET: z.string(),

    AWS_REGION: z.string(),
    AWS_ACCESS_KEY_ID: z.string(),
    AWS_SECRET_ACCESS_KEY: z.string(),

    // ECS Configuration
    AWS_SUBNET_ID: z.string(),
    AWS_SECURITY_GROUP_ID: z.string(),
    AWS_ECS_CLUSTER: z.string().default("hostly-cluster"),
    AWS_TASK_DEFINITION: z.string().default("hostly-builder"),
    AWS_LOG_GROUP: z.string().default("/ecs/hostly-builder"),
    AWS_LOG_STREAM_PREFIX: z.string().default("ecs/builder"),

    BUILD_BUCKET: z.string(),

    BUILDER_CALLBACK_URL: z
      .string()
      .url()
      .default("https://hostly.dev/api/builder/callback"),

    // NextAuth

    NEXTAUTH_URL: z.string(),
    NEXTAUTH_SECRET: z.string(),

    // Redis

    REDIS_URL: z.string(),

    // Deploy Domain
    DEPLOY_DOMAIN: z.string().default("hostly.ooguy.com"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
    // NEXT_PUBLIC_GITHUB_APP_URL: z.string().url(),
    NEXT_PUBLIC_DEPLOY_DOMAIN: z.string().default("hostly.ooguy.com"),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,

    GITHUB_ID: process.env.GITHUB_ID,
    GITHUB_APP_ID: process.env.GITHUB_APP_ID,
    GITHUB_SECRET: process.env.GITHUB_SECRET,
    GITHUB_PRIVATE_KEY: process.env.GITHUB_PRIVATE_KEY,
    GITHUB_APP_URL: process.env.GITHUB_APP_URL,
    GITHUB_APP_SLUG: process.env.GITHUB_APP_SLUG,
    GITHUB_WEBHOOK_SECRET: process.env.GITHUB_WEBHOOK_SECRET,

    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,

    AWS_SUBNET_ID: process.env.AWS_SUBNET_ID,
    AWS_SECURITY_GROUP_ID: process.env.AWS_SECURITY_GROUP_ID,
    AWS_ECS_CLUSTER: process.env.AWS_ECS_CLUSTER,
    AWS_TASK_DEFINITION: process.env.AWS_TASK_DEFINITION,
    AWS_LOG_GROUP: process.env.AWS_LOG_GROUP,
    AWS_LOG_STREAM_PREFIX: process.env.AWS_LOG_STREAM_PREFIX,

    // Removed Cloud Tasks environment variables
    // GOOGLE_CLOUD_TASKS_LOCATION: process.env.GOOGLE_CLOUD_TASKS_LOCATION,
    // GOOGLE_CLOUD_TASKS_QUEUE: process.env.GOOGLE_CLOUD_TASKS_QUEUE,

    BUILD_BUCKET: process.env.BUILD_BUCKET,
    BUILDER_CALLBACK_URL: process.env.BUILDER_CALLBACK_URL,

    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

    REDIS_URL: process.env.REDIS_URL,

    DEPLOY_DOMAIN: process.env.DEPLOY_DOMAIN,

    // === Client ===
    // NEXT_PUBLIC_GITHUB_APP_URL: process.env.NEXT_PUBLIC_GITHUB_APP_URL,
    NEXT_PUBLIC_DEPLOY_DOMAIN: process.env.NEXT_PUBLIC_DEPLOY_DOMAIN,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
