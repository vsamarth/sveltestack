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

// Types for user creation
interface CreateUserOptions {
  id?: string;
  email: string;
  password: string;
  name: string;
  emailVerified?: boolean;
  workspaceName?: string;
}

interface CreatedUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  workspaceId: string;
}

/**
 * Creates a complete user with account and workspace
 */
async function createUser(options: CreateUserOptions): Promise<CreatedUser> {
  const {
    id = ulid(),
    email,
    password,
    name,
    emailVerified = false,
    workspaceName = "Personal",
  } = options;

  const hashedPassword = await hash(password);
  const workspaceId = ulid();

  // Create user
  await db.insert(schema.user).values({
    id,
    email,
    name,
    emailVerified,
  });

  // Create account with credentials
  await db.insert(schema.account).values({
    id: ulid(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: hashedPassword,
  });

  // Create default workspace
  await db.insert(schema.workspace).values({
    id: workspaceId,
    name: workspaceName,
    ownerId: id,
  });

  return { id, email, name, emailVerified, workspaceId };
}

// Import test users from shared fixture (used by both seed and e2e tests)
// Note: Using relative path for tsx execution
import { TEST_USERS } from "../../../../tests/fixtures/test-users";

// Convert TEST_USERS object to array for iteration
const TEST_USERS_ARRAY = Object.values(
  TEST_USERS,
) satisfies readonly CreateUserOptions[];

async function createTestUsers() {
  console.log("👤 Creating test users...");

  const createdUsers: CreatedUser[] = [];

  for (const userConfig of TEST_USERS_ARRAY) {
    const user = await createUser(userConfig);
    createdUsers.push(user);
  }

  console.log("✅ Test users created:");
  for (const user of createdUsers) {
    const status = user.emailVerified ? "verified" : "unverified";
    console.log(`   - ${user.email} (${status})`);
  }

  return createdUsers;
}

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  // Create test users first
  await createTestUsers();

  // Create additional random users
  const userIds = Array.from({ length: 10 }, () => ulid());
  const demoPassword = await hash("demo@123");

  await seed(db, {
    user: schema.user,
    account: schema.account,
    workspace: schema.workspace,
    userPreferences: schema.userPreferences,
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
          values: ["credential"],
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
    workspace: {
      count: 10,
      columns: {
        id: f.default({ defaultValue: undefined }),
        name: f.valuesFromArray({ values: ["Personal"] }),
        ownerId: f.valuesFromArray({ values: userIds, isUnique: true }),
        createdAt: f.default({ defaultValue: undefined }),
        updatedAt: f.default({ defaultValue: undefined }),
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
    userPreferences: schema.userPreferences,
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