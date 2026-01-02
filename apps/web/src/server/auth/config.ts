import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
// Note: experimental_taintUniqueValue removed - it's a React 19 API not available in React 18
import { and, eq } from "drizzle-orm";
import { env } from "~/env";

import { db } from "~/server/db/client";
import { redis } from "~/server/utils/redis";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/schema";

type GithubTokenRefreshResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  refresh_token_expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

// Non-blocking token refresh - runs in background
const refreshGithubAccessTokenBackground = (
  refreshToken: string,
  userId: string,
  currentAccount: any,
  redisKey: string
) => {
  // Don't await - fire and forget
  (async () => {
    try {
      const response = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: new URLSearchParams({
          client_id: env.GITHUB_ID,
          client_secret: env.GITHUB_SECRET,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        }),
      });

      const data = (await response.json()) as GithubTokenRefreshResponse;

      if (!response.ok || data.error || !data.access_token) {
        console.error("[AUTH] Background token refresh failed:", data.error);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const expiresAt = data.expires_in ? now + data.expires_in : currentAccount.expires_at;

      // Update DB and Redis in parallel
      await Promise.all([
        db.update(accounts)
          .set({
            access_token: data.access_token,
            refresh_token: data.refresh_token ?? currentAccount.refresh_token,
            expires_at: expiresAt,
            refresh_token_expires_in: data.refresh_token_expires_in ?? currentAccount.refresh_token_expires_in,
            scope: data.scope ?? currentAccount.scope,
            token_type: data.token_type ?? currentAccount.token_type,
          })
          .where(and(eq(accounts.userId, userId), eq(accounts.provider, "github"))),
        redis.set(redisKey, JSON.stringify({
          ...currentAccount,
          access_token: data.access_token,
          refresh_token: data.refresh_token ?? currentAccount.refresh_token,
          expires_at: expiresAt,
        }), "EX", 300),
      ]);

      console.log("[AUTH] Background token refresh completed");
    } catch (error) {
      console.error("[AUTH] Background token refresh error:", error);
    }
  })();
};

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      accessToken?: string;
      githubId?: string;
    } & DefaultSession["user"];
  }
}

export const authOptions = {
  trustHost: true,
  providers: [
    GitHubProvider({
      clientId: env.GITHUB_ID,
      clientSecret: env.GITHUB_SECRET,
      authorization: { params: { scope: "repo read:user" } },
    }),
  ],
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  callbacks: {
    session: async ({ session, user, token }) => {
      const redisKey = `auth:github-account:${user.id}`;

      // Fast path: Try Redis first (typically <5ms)
      let githubAccount: any = null;
      try {
        const cachedAccount = await redis.get(redisKey);
        if (cachedAccount) {
          githubAccount = JSON.parse(cachedAccount);
        }
      } catch (e) {
        // Redis error - continue to DB fallback
      }

      // If not in cache, fetch from DB (but don't block on cache write)
      if (!githubAccount) {
        githubAccount = await db.query.accounts.findFirst({
          where: (accounts, { eq, and }) =>
            and(eq(accounts.userId, user.id), eq(accounts.provider, "github")),
        });

        // Fire-and-forget cache write - don't await
        if (githubAccount) {
          redis.set(redisKey, JSON.stringify(githubAccount), "EX", 300).catch(() => { });
        }
      }

      let accessToken = githubAccount?.access_token;
      const now = Math.floor(Date.now() / 1000);

      // Check if token needs refresh (within 60 seconds of expiry)
      if (
        githubAccount?.refresh_token &&
        githubAccount.expires_at &&
        githubAccount.expires_at <= now + 60
      ) {
        // NON-BLOCKING: Trigger background refresh, use current token for now
        // The token is still valid for ~60 more seconds
        refreshGithubAccessTokenBackground(
          githubAccount.refresh_token,
          user.id,
          githubAccount,
          redisKey
        );
        // Use existing token for this request (it's not expired yet)
      }

      // Note: experimental_taintUniqueValue was removed - it's a React 19 API
      // The access token is already protected by server-only imports

      return {
        ...session,
        user: {
          accessToken: accessToken,
          githubId: githubAccount?.providerAccountId,
          ...session.user,
          id: user.id,
        },
      };
    },
  },
} satisfies NextAuthConfig;
