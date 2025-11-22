#!/usr/bin/env tsx
import "dotenv/config";
import { seed, reset } from "drizzle-seed";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ulid } from "ulid";

import * as schema from "./schema";
import { hash } from "../auth/hash";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

const command = process.argv[2];

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  const userIds = Array.from({ length: 10 }, () => ulid());
  const demoPassword = await hash("demo@123");

  await seed(db, {
    user: schema.user,
    account: schema.account,
  }).refine((f) => ({
    user: {
      count: 10,
      columns: {
        id: f.valuesFromArray({ values: userIds, isUnique: true }),
        image: f.default({ defaultValue: undefined }),
        createdAt: f.default({ defaultValue: undefined }),
        updatedAt: f.default({ defaultValue: undefined }),
        name: f.fullName(),
        email: f.email(),
        emailVerified: f.valuesFromArray({
          values: [false],
        }),
      },
    },
    account: {
      count: 10,
      columns: {
        id: f.default({ defaultValue: undefined }),
        createdAt: f.default({ defaultValue: undefined }),
        updatedAt: f.default({ defaultValue: undefined }),
        accountId: f.string({ isUnique: true }),
        providerId: f.valuesFromArray({
          values: ['credential'],
        }),
        userId: f.valuesFromArray({ values: userIds, isUnique: true }),
        accessToken: f.default({ defaultValue: undefined }),
        refreshToken: f.default({ defaultValue: undefined }),
        idToken: f.default({ defaultValue: undefined }),
        accessTokenExpiresAt: f.default({ defaultValue: undefined }),
        refreshTokenExpiresAt: f.default({ defaultValue: undefined }),
        scope: f.default({ defaultValue: undefined }),
        password: f.valuesFromArray({ values: [demoPassword] }),
      },
    },
  }));

  console.log("✅ Database seeded successfully!");
}

async function resetDatabase() {
  console.log("🔄 Resetting database...");

  await reset(db, {
    user: schema.user,
    session: schema.session,
    account: schema.account,
    verification: schema.verification,
    workspace: schema.workspace,
    file: schema.file,
  });

  console.log("✅ Database reset successfully!");
}

async function main() {
  // Production safety guard
  if (process.env.NODE_ENV === "production" && process.env.FORCE !== "true") {
    console.error("❌ Cannot run seed/reset in production without FORCE=true");
    process.exit(1);
  }

  try {
    switch (command) {
      case "seed":
        await seedDatabase();
        break;
      case "reset":
        await resetDatabase();
        break;
      case "reset-seed":
        await resetDatabase();
        await seedDatabase();
        break;
      default:
        console.log("Usage: tsx seed.ts [seed|reset|reset-seed]");
        console.log("");
        console.log("Commands:");
        console.log("  seed        - Seed the database with sample data");
        console.log("  reset       - Reset (truncate) all tables");
        console.log("  reset-seed  - Reset and then seed the database");
        process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
