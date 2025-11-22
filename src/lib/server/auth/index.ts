import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { getRequestEvent } from "$app/server";
import { hash, verify } from "./hash";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    password: {
      hash,
      verify: async (data) => {
        return await verify(data.hash, data.password);
      },
    },
  },
  plugins: [sveltekitCookies(getRequestEvent)],
});
