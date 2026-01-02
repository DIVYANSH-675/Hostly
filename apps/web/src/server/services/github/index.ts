import { App } from "octokit";
import { env } from "~/env";

// Decode base64-encoded private key to PEM format
const privateKey = Buffer.from(env.GITHUB_PRIVATE_KEY, 'base64').toString('utf-8');

export const githubApp = new App({
  appId: env.GITHUB_APP_ID,
  privateKey: privateKey,
});
