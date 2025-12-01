#!/usr/bin/env tsx
import "dotenv/config";
import { reset } from "drizzle-seed";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";

import * as schema from "../src/lib/server/db/schema";
import { hash } from "../src/lib/server/auth/hash";
import { initBucket, uploadFile } from "../src/lib/server/storage";
import {
  createWorkspace,
  updateWorkspace,
} from "../src/lib/server/db/workspace";
import {
  createPendingFile,
  confirmFileUpload,
  renameFile,
} from "../src/lib/server/db/file";
import { addMember } from "../src/lib/server/db/membership";
import { createInvite, cancelInvite } from "../src/lib/server/db/invite";
import {
  logFileDownloaded,
  logInviteAccepted,
} from "../src/lib/server/db/activity";
import { TEST_USERS } from "../tests/fixtures/test-users";
import { generateFileContent } from "../tests/fixtures/file-samples";
import { FILE_SEEDS } from "../tests/fixtures/file-seeds";
import { WORKSPACE_CONFIG } from "../tests/fixtures/workspace-config";
import { INVITE_CONFIG } from "../tests/fixtures/invite-config";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });
const command = process.argv[2];

interface CreatedUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  workspaceId: string;
}

const findUser = (users: CreatedUser[], email: string) =>
  users.find((u) => u.email === email)!;

async function ensureUser(
  config: (typeof TEST_USERS)[keyof typeof TEST_USERS],
): Promise<CreatedUser> {
  const {
    id,
    email,
    password,
    name,
    emailVerified = false,
    workspaceName = "Personal",
  } = config;

  let user = await db
    .select()
    .from(schema.user)
    .where(eq(schema.user.id, id))
    .limit(1)
    .then((r) => r[0]);
  if (!user) {
    await db.insert(schema.user).values({ id, email, name, emailVerified });
    await db.insert(schema.account).values({
      id: ulid(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: await hash(password),
    });
    user = {
      id,
      email,
      name,
      emailVerified,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  let workspace = await db
    .select()
    .from(schema.workspace)
    .where(eq(schema.workspace.ownerId, id))
    .limit(1)
    .then((r) => r[0]);
  if (!workspace) workspace = await createWorkspace(workspaceName, id);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    workspaceId: workspace.id,
  };
}

async function seedFile(
  workspaceId: string,
  ownerId: string,
  file: (typeof FILE_SEEDS)[string][number],
) {
  const extension = file.filename.split(".").pop() ?? "bin";
  const storageKey = `${ulid()}.${extension}`;
  await uploadFile(
    storageKey,
    generateFileContent(file.filename, file.contentType, file.size),
    file.contentType,
  );
  const pending = await createPendingFile(
    workspaceId,
    file.filename,
    storageKey,
    file.size,
    file.contentType,
  );
  return await confirmFileUpload(pending.id, ownerId);
}

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  console.log("👤 Creating test users...");
  const users = await Promise.all(Object.values(TEST_USERS).map(ensureUser));
  console.log("✅ Test users created:");
  users.forEach((u) =>
    console.log(
      `   - ${u.email} (${u.emailVerified ? "verified" : "unverified"})`,
    ),
  );

  const verifiedUser = findUser(users, TEST_USERS.verified.email);
  const memberUser = findUser(users, TEST_USERS.member.email);
  const invitedUser = findUser(users, TEST_USERS.invited.email);

  console.log("📁 Creating workspace fixtures...");
  await initBucket();

  const workspaces = {
    default: { id: verifiedUser.workspaceId },
    personal: await createWorkspace(
      WORKSPACE_CONFIG.personal.name,
      verifiedUser.id,
    ),
    team: await createWorkspace(WORKSPACE_CONFIG.team.name, verifiedUser.id),
    empty: await createWorkspace(WORKSPACE_CONFIG.empty.name, verifiedUser.id),
  };

  // Demonstrate workspace rename
  await db
    .update(schema.workspace)
    .set({ name: WORKSPACE_CONFIG.personal.renameFrom })
    .where(eq(schema.workspace.id, workspaces.personal.id));
  await updateWorkspace(
    workspaces.personal.id,
    WORKSPACE_CONFIG.personal.name,
    verifiedUser.id,
  );

  // Seed files
  const allFiles = (
    await Promise.all(
      Object.entries(FILE_SEEDS).map(([wsKey, files]) =>
        Promise.all(
          files.map((f) =>
            seedFile(
              workspaces[wsKey as keyof typeof workspaces].id,
              verifiedUser.id,
              f,
            ),
          ),
        ),
      ),
    )
  ).flat();

  // Demonstrate file rename
  const fileToRename = allFiles.find((f) => f.filename === "meeting-notes.txt");
  if (fileToRename) {
    await db
      .update(schema.file)
      .set({ filename: "notes.txt" })
      .where(eq(schema.file.id, fileToRename.id));
    await renameFile(fileToRename.id, "meeting-notes.txt", verifiedUser.id);
  }

  // Add download activities
  await Promise.all(
    allFiles
      .slice(0, 2)
      .map((f) =>
        logFileDownloaded(f.workspaceId, verifiedUser.id, f.id, f.filename),
      ),
  );

  // Add members
  await Promise.all([
    addMember(workspaces.default.id, memberUser.id, verifiedUser.id),
    addMember(workspaces.team.id, memberUser.id, verifiedUser.id),
  ]);

  // Create invites
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const invites = {
    pending: await createInvite(
      workspaces.default.id,
      invitedUser.email.toLowerCase(),
      verifiedUser.id,
      INVITE_CONFIG.pending.role,
      expiresAt,
    ),
    accepted: await createInvite(
      workspaces.team.id,
      INVITE_CONFIG.accepted.email,
      verifiedUser.id,
      INVITE_CONFIG.accepted.role,
      expiresAt,
    ),
    cancelled: await createInvite(
      workspaces.default.id,
      INVITE_CONFIG.cancelled.email,
      verifiedUser.id,
      INVITE_CONFIG.cancelled.role,
      expiresAt,
    ),
  };

  // Mark accepted invite
  await db
    .update(schema.workspaceInvite)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(schema.workspaceInvite.id, invites.accepted.id));
  await logInviteAccepted(
    workspaces.team.id,
    verifiedUser.id,
    invites.accepted.id,
    INVITE_CONFIG.accepted.email,
  );

  // Cancel invite
  await cancelInvite(invites.cancelled.id, verifiedUser.id);

  console.log("✅ Workspace fixtures created:");
  Object.entries(workspaces).forEach(([key, ws]) => {
    const name =
      key === "default"
        ? "Default workspace"
        : WORKSPACE_CONFIG[key as keyof typeof WORKSPACE_CONFIG]?.name || key;
    console.log(`   - ${name} (${ws.id})`);
  });
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
    workspaceActivity: schema.workspaceActivity,
    workspaceMember: schema.workspaceMember,
    workspaceInvite: schema.workspaceInvite,
  });
  console.log("✅ Database reset successfully!");
}

async function main() {
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
        console.log("Usage: tsx scripts/seed.ts [seed|reset|reset-seed]");
        console.log("\nCommands:");
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
