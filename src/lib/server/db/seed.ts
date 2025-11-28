#!/usr/bin/env tsx
import "dotenv/config";
import { seed, reset } from "drizzle-seed";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ulid } from "ulid";
import { randomBytes, createHash } from "node:crypto";

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
  const testUsers = await createTestUsers();
  await seedWorkspaceFixtures(testUsers);

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

type FileSeed = {
  filename: string;
  contentType: string;
  size: number;
};

function createHashedToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

async function addFilesToWorkspace(
  workspaceId: string,
  files: FileSeed[],
) {
  if (files.length === 0) return;

  await db.insert(schema.file).values(
    files.map((fileSeed) => ({
      id: ulid(),
      workspaceId,
      filename: fileSeed.filename,
      storageKey: `${ulid()}.${fileSeed.filename.split(".").pop()}`,
      size: fileSeed.size.toString(),
      contentType: fileSeed.contentType,
      status: "completed" as const,
    }))
  );

}

async function seedWorkspaceFixtures(users: CreatedUser[]) {
  const verifiedUser = users.find(
    (user) => user.email === TEST_USERS.verified.email,
  );
  const memberUser = users.find(
    (user) => user.email === TEST_USERS.member.email,
  );
  const invitedUser = users.find(
    (user) => user.email === TEST_USERS.invited.email,
  );

  if (!verifiedUser || !memberUser || !invitedUser) {
    console.warn("⚠️ Missing expected test users. Skipping workspace fixtures.");
    return;
  }

  console.log("📁 Creating workspace fixtures...");

  const defaultWorkspaceId = verifiedUser.workspaceId;

  const [personalWorkspace] = await db
    .insert(schema.workspace)
    .values({
      id: ulid(),
      name: "Personal Projects",
      ownerId: verifiedUser.id,
    })
    .returning();
  const personalWorkspaceId = personalWorkspace.id;

  const [teamWorkspace] = await db
    .insert(schema.workspace)
    .values({
      id: ulid(),
      name: "Team Workspace",
      ownerId: verifiedUser.id,
    })
    .returning();
  const teamWorkspaceId = teamWorkspace.id;

  const [emptyWorkspace] = await db
    .insert(schema.workspace)
    .values({
      id: ulid(),
      name: "Empty Workspace",
      ownerId: verifiedUser.id,
    })
    .returning();
  const emptyWorkspaceId = emptyWorkspace.id;

  await addFilesToWorkspace(defaultWorkspaceId, [
    {
      filename: "project-plan.pdf",
      contentType: "application/pdf",
      size: 256000,
    },
    {
      filename: "design-assets.png",
      contentType: "image/png",
      size: 183000,
    },
    {
      filename: "meeting-notes.txt",
      contentType: "text/plain",
      size: 4096,
    },
  ]);

  await addFilesToWorkspace(personalWorkspaceId, [
    {
      filename: "budget.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 102400,
    },
    {
      filename: "roadmap.md",
      contentType: "text/markdown",
      size: 5120,
    },
  ]);

  await addFilesToWorkspace(teamWorkspaceId, [
    {
      filename: "team-photo.jpg",
      contentType: "image/jpeg",
      size: 204800,
    },
    {
      filename: "requirements.docx",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 307200,
    },
    {
      filename: "research.pdf",
      contentType: "application/pdf",
      size: 512000,
    },
  ]);

  // Share default and team workspaces with member user
  await db.insert(schema.workspaceMember).values([
    {
      id: ulid(),
      workspaceId: defaultWorkspaceId,
      userId: memberUser.id,
    },
    {
      id: ulid(),
      workspaceId: teamWorkspaceId,
      userId: memberUser.id,
    },
  ]);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const pendingInvite = createHashedToken();
  await db.insert(schema.workspaceInvite).values({
    id: ulid(),
    workspaceId: defaultWorkspaceId,
    email: invitedUser.email,
    invitedBy: verifiedUser.id,
    role: "member",
    token: pendingInvite.tokenHash,
    expiresAt,
    status: "pending",
  });

  const acceptedInvite = createHashedToken();
  await db.insert(schema.workspaceInvite).values({
    id: ulid(),
    workspaceId: teamWorkspaceId,
    email: "accepted-member@example.com",
    invitedBy: verifiedUser.id,
    role: "member",
    token: acceptedInvite.tokenHash,
    status: "accepted",
    acceptedAt: new Date(),
  });

  console.log("✅ Workspace fixtures created:");
  console.log(`   - Default workspace (${defaultWorkspaceId}) seeded`);
  console.log(`   - Personal Projects workspace (${personalWorkspaceId}) seeded`);
  console.log(`   - Team Workspace (${teamWorkspaceId}) seeded`);
  console.log(`   - Empty Workspace (${emptyWorkspaceId}) ready for tests`);
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
