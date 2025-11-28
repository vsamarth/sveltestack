#!/usr/bin/env tsx
import "dotenv/config";
import { seed, reset } from "drizzle-seed";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { ulid } from "ulid";
import { randomBytes, createHash } from "node:crypto";

import * as schema from "./schema";
import { hash } from "../auth/hash";
import { initBucket, uploadFile } from "../storage";

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

const SAMPLE_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO8jvKQAAAAASUVORK5CYII=",
  "base64",
);

const SAMPLE_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhISEhIWFRUVFRUVFRUVFRUVFRUWFxUVFRUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OFg8QFy0dHR0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAXAAEBAQEAAAAAAAAAAAAAAAAAAQID/8QAFhABAQEAAAAAAAAAAAAAAAAAAAEC/9oADAMBAAIQAxAAAAGzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAf/EABkQAAMAAwAAAAAAAAAAAAAAAAABAgMEBf/aAAgBAQABBQLnV5xvqcWz/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAwEBPwE//8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAgBAgEBPwE//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQAGPwJ//8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPyF//9k=",
  "base64",
);

const SAMPLE_PDF = Buffer.from(
  `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 18 Tf 72 720 Td (Seeded file)
Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000061 00000 n
0000000118 00000 n
0000000215 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`,
  "utf-8",
);

function padBinaryContent(base: Buffer, size: number) {
  const targetSize = Math.max(size, base.length);
  if (targetSize === base.length) {
    return Buffer.from(base);
  }

  const padded = Buffer.alloc(targetSize);
  base.copy(padded);
  return padded;
}

function buildTextBuffer(filename: string, size: number) {
  const safeSize = Math.max(size, 128);
  const baseLine = `Seeded file generated for ${filename}.\n`;
  const repeatCount = Math.ceil(safeSize / baseLine.length);
  const text = baseLine.repeat(Math.max(1, repeatCount)).slice(0, safeSize);
  return Buffer.from(text, "utf-8");
}

function generateFileContent(
  filename: string,
  contentType: string,
  size: number,
) {
  const safeSize = Math.max(size, 256);
  const normalizedType = contentType.toLowerCase();

  if (normalizedType.includes("pdf")) {
    return padBinaryContent(SAMPLE_PDF, safeSize);
  }

  if (normalizedType.includes("png")) {
    return padBinaryContent(SAMPLE_PNG, safeSize);
  }

  if (normalizedType.includes("jpeg") || normalizedType.includes("jpg")) {
    return padBinaryContent(SAMPLE_JPEG, safeSize);
  }

  if (
    normalizedType.startsWith("text/") ||
    normalizedType.includes("markdown") ||
    normalizedType.includes("plain")
  ) {
    return buildTextBuffer(filename, safeSize);
  }

  return Buffer.alloc(safeSize);
}

function createHashedToken() {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

async function addFilesToWorkspace(workspaceId: string, files: FileSeed[]) {
  if (files.length === 0) return [];

  const fileRecords = [];

  for (const fileSeed of files) {
    const extension = fileSeed.filename.includes(".")
      ? fileSeed.filename.split(".").pop()
      : undefined;
    const storageKey = `${ulid()}.${extension ?? "bin"}`;
    const body = generateFileContent(
      fileSeed.filename,
      fileSeed.contentType,
      fileSeed.size,
    );

    await uploadFile(storageKey, body, fileSeed.contentType);

    fileRecords.push({
      id: ulid(),
      workspaceId,
      filename: fileSeed.filename,
      storageKey,
      size: fileSeed.size.toString(),
      contentType: fileSeed.contentType,
      status: "completed" as const,
    });
  }

  await db.insert(schema.file).values(fileRecords);
  return fileRecords;
}

async function seedActivityEvents(
  verifiedUser: CreatedUser,
  memberUser: CreatedUser,
  defaultWorkspaceId: string,
  personalWorkspaceId: string,
  teamWorkspaceId: string,
  files: Array<{
    id: string;
    filename: string;
    size: string;
    contentType: string | null;
    workspaceId: string;
  }>,
  members: Array<{ workspaceId: string; userId: string; id: string }>,
  invites: Array<{
    id: string;
    workspaceId: string;
    email: string;
    status: string;
  }>,
) {
  console.log("📊 Creating activity events...");

  // Helper to create activity with varied timestamps
  const createActivityWithTime = async (
    workspaceId: string,
    actorId: string,
    eventType:
      | "workspace.created"
      | "workspace.renamed"
      | "workspace.deleted"
      | "file.uploaded"
      | "file.renamed"
      | "file.deleted"
      | "file.downloaded"
      | "member.added"
      | "member.removed"
      | "invite.sent"
      | "invite.accepted"
      | "invite.cancelled",
    metadata: Record<string, unknown> | null,
    entityType: "workspace" | "file" | "member" | "invite" | null,
    entityId: string | null,
    hoursAgo: number,
  ) => {
    const createdAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    await db.insert(schema.workspaceActivity).values({
      id: ulid(),
      workspaceId,
      actorId,
      eventType,
      metadata: metadata || null,
      entityType: entityType || null,
      entityId: entityId || null,
      createdAt,
    });
  };

  // Workspace creation events (oldest - 7 days ago)
  await createActivityWithTime(
    defaultWorkspaceId,
    verifiedUser.id,
    "workspace.created",
    null,
    "workspace",
    defaultWorkspaceId,
    7 * 24,
  );

  await createActivityWithTime(
    personalWorkspaceId,
    verifiedUser.id,
    "workspace.created",
    null,
    "workspace",
    personalWorkspaceId,
    5 * 24,
  );

  await createActivityWithTime(
    teamWorkspaceId,
    verifiedUser.id,
    "workspace.created",
    null,
    "workspace",
    teamWorkspaceId,
    3 * 24,
  );

  // Workspace rename event (4 days ago)
  await createActivityWithTime(
    personalWorkspaceId,
    verifiedUser.id,
    "workspace.renamed",
    { oldName: "My Projects", newName: "Personal Projects" },
    "workspace",
    personalWorkspaceId,
    4 * 24,
  );

  // File upload events (various times)
  let hoursAgo = 6 * 24; // Start 6 days ago
  for (const file of files) {
    await createActivityWithTime(
      file.workspaceId,
      verifiedUser.id,
      "file.uploaded",
      {
        filename: file.filename,
        size: file.size,
        contentType: file.contentType,
      },
      "file",
      file.id,
      hoursAgo,
    );
    hoursAgo -= 2; // Each file 2 hours earlier
  }

  // File rename event (2 days ago)
  const fileToRename = files.find((f) => f.filename === "meeting-notes.txt");
  if (fileToRename) {
    await createActivityWithTime(
      fileToRename.workspaceId,
      verifiedUser.id,
      "file.renamed",
      {
        oldFilename: "notes.txt",
        newFilename: "meeting-notes.txt",
      },
      "file",
      fileToRename.id,
      2 * 24,
    );
  }

  // File download events (recent - last 24 hours)
  const filesToDownload = files.slice(0, 2);
  for (let i = 0; i < filesToDownload.length; i++) {
    await createActivityWithTime(
      filesToDownload[i].workspaceId,
      verifiedUser.id,
      "file.downloaded",
      { filename: filesToDownload[i].filename },
      "file",
      filesToDownload[i].id,
      (i + 1) * 2, // 2h, 4h ago
    );
  }

  // Member addition events (when members were added)
  for (const member of members) {
    const memberUserDetails =
      memberUser.id === member.userId ? memberUser : verifiedUser;
    await createActivityWithTime(
      member.workspaceId,
      memberUserDetails.id,
      "member.added",
      {
        memberEmail: memberUserDetails.email,
        memberName: memberUserDetails.name,
        role: "member",
      },
      "member",
      member.id,
      3 * 24, // 3 days ago
    );
  }

  // Invite sent events
  for (const invite of invites) {
    await createActivityWithTime(
      invite.workspaceId,
      verifiedUser.id,
      invite.status === "accepted" ? "invite.accepted" : "invite.sent",
      { inviteEmail: invite.email, role: "member" },
      "invite",
      invite.id,
      invite.status === "accepted" ? 2 * 24 : 1 * 24,
    );
  }

  // One cancelled invite event (12 hours ago)
  const cancelledInvite = invites.find((i) => i.status === "cancelled");
  if (cancelledInvite) {
    await createActivityWithTime(
      cancelledInvite.workspaceId,
      verifiedUser.id,
      "invite.cancelled",
      { inviteEmail: cancelledInvite.email },
      "invite",
      cancelledInvite.id,
      12,
    );
  }

  console.log("✅ Activity events created");
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
    console.warn(
      "⚠️ Missing expected test users. Skipping workspace fixtures.",
    );
    return;
  }

  console.log("📁 Creating workspace fixtures...");

  await initBucket();

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

  const defaultFiles = await addFilesToWorkspace(defaultWorkspaceId, [
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

  const personalFiles = await addFilesToWorkspace(personalWorkspaceId, [
    {
      filename: "budget.xlsx",
      contentType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      size: 102400,
    },
    {
      filename: "roadmap.md",
      contentType: "text/markdown",
      size: 5120,
    },
  ]);

  const teamFiles = await addFilesToWorkspace(teamWorkspaceId, [
    {
      filename: "team-photo.jpg",
      contentType: "image/jpeg",
      size: 204800,
    },
    {
      filename: "requirements.docx",
      contentType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: 307200,
    },
    {
      filename: "research.pdf",
      contentType: "application/pdf",
      size: 512000,
    },
  ]);

  const allFiles = [...defaultFiles, ...personalFiles, ...teamFiles];

  // Share default and team workspaces with member user
  const memberRecords = [
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
  ];
  await db.insert(schema.workspaceMember).values(memberRecords);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const pendingInvite = createHashedToken();
  const pendingInviteId = ulid();
  await db.insert(schema.workspaceInvite).values({
    id: pendingInviteId,
    workspaceId: defaultWorkspaceId,
    email: invitedUser.email,
    invitedBy: verifiedUser.id,
    role: "member",
    token: pendingInvite.tokenHash,
    expiresAt,
    status: "pending",
  });

  const acceptedInvite = createHashedToken();
  const acceptedInviteId = ulid();
  await db.insert(schema.workspaceInvite).values({
    id: acceptedInviteId,
    workspaceId: teamWorkspaceId,
    email: "accepted-member@example.com",
    invitedBy: verifiedUser.id,
    role: "member",
    token: acceptedInvite.tokenHash,
    status: "accepted",
    acceptedAt: new Date(),
  });

  const allInvites = [
    {
      id: pendingInviteId,
      workspaceId: defaultWorkspaceId,
      email: invitedUser.email,
      status: "pending",
    },
    {
      id: acceptedInviteId,
      workspaceId: teamWorkspaceId,
      email: "accepted-member@example.com",
      status: "accepted",
    },
  ];

  // Seed activity events
  await seedActivityEvents(
    verifiedUser,
    memberUser,
    defaultWorkspaceId,
    personalWorkspaceId,
    teamWorkspaceId,
    allFiles,
    memberRecords,
    allInvites,
  );

  console.log("✅ Workspace fixtures created:");
  console.log(`   - Default workspace (${defaultWorkspaceId}) seeded`);
  console.log(
    `   - Personal Projects workspace (${personalWorkspaceId}) seeded`,
  );
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
