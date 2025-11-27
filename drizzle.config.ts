import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export default defineConfig({
  schema: [
    "./src/lib/server/db/schema/auth.ts",
    "./src/lib/server/db/schema/workspace.ts",
    "./src/lib/server/db/schema/file.ts",
    "./src/lib/server/db/schema/user-preferences.ts",
    "./src/lib/server/db/schema/index.ts",
  ],
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL },
  verbose: true,
  strict: true,
});
