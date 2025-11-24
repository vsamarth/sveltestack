import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { hash, verify } from "./hash";
import { createAuthMiddleware } from "better-auth/api";
import { createDefaultWorkspace } from "../db/workspace";
import { env } from "../env";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  secret: env.BETTER_AUTH_SECRET,
  emailAndPassword: {
    enabled: true,
    password: {
      hash,
      verify: async (data) => {
        return await verify(data.hash, data.password);
      },
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ url, user }) => {
      console.log(`Verification URL for ${user.email}: ${url}`);
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (!ctx.path.startsWith("/sign-up")) {
        return;
      }

      const newSession = ctx.context.newSession;
      if (newSession && newSession.user) {
        // Create a default workspace for the new user
        await createDefaultWorkspace(newSession.user.id);
      }
    }),
  },
  plugins: [sveltekitCookies(getRequestEvent)],
});
