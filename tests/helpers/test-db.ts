import { eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
  user,
  account,
  workspace,
  userPreferences,
  workspaceMember,
  file,
  workspaceInvite,
} from "$lib/server/db/schema";
import { hash } from "$lib/server/auth/hash";
import { ulid } from "ulid";
import type { User } from "better-auth/types";
import { randomBytes, createHash } from "node:crypto";

export async function createTestUser(options?: {
  id?: string;
  email?: string;
  name?: string;
  emailVerified?: boolean;
}): Promise<User> {
  const id = options?.id || ulid();
  const email = options?.email || `test-${ulid()}@example.com`;
  const name = options?.name || "Test User";
  const emailVerified = options?.emailVerified ?? true;

  const hashedPassword = await hash("password123");

  const [createdUser] = await db
    .insert(user)
    .values({
      id,
      email,
      name,
      emailVerified,
    })
    .returning();

  await db.insert(account).values({
    id: ulid(),
    userId: id,
    accountId: id,
    providerId: "credential",
    password: hashedPassword,
  });

  await db.insert(userPreferences).values({
    userId: id,
  });

  return {
    id: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    emailVerified: createdUser.emailVerified,
    image: createdUser.image,
    createdAt: createdUser.createdAt,
    updatedAt: createdUser.updatedAt,
  };
}

export async function createTestWorkspace(options: {
  name: string;
  ownerId: string;
  id?: string;
}) {
  const workspaceId = options.id || ulid();
  const [createdWorkspace] = await db
    .insert(workspace)
    .values({
      id: workspaceId,
      name: options.name,
      ownerId: options.ownerId,
    })
    .returning();

  return createdWorkspace;
}

export async function createTestMember(options: {
  workspaceId: string;
  userId: string;
  role?: "member";
  id?: string;
}) {
  const memberId = options.id || ulid();
  const [createdMember] = await db
    .insert(workspaceMember)
    .values({
      id: memberId,
      workspaceId: options.workspaceId,
      userId: options.userId,
      role: options.role || "member",
    })
    .returning();

  return createdMember;
}

export async function createTestFile(options: {
  workspaceId: string;
  filename: string;
  storageKey?: string;
  size?: number;
  contentType?: string;
  status?: "pending" | "completed" | "failed";
  id?: string;
}) {
  const fileId = options.id || ulid();
  const storageKey =
    options.storageKey ||
    `${ulid()}.${options.filename.split(".").pop() || "txt"}`;
  const [createdFile] = await db
    .insert(file)
    .values({
      id: fileId,
      workspaceId: options.workspaceId,
      filename: options.filename,
      storageKey,
      size: (options.size || 0).toString(),
      contentType: options.contentType || "application/octet-stream",
      status: options.status || "completed",
    })
    .returning();

  return createdFile;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createTestInvite(options: {
  workspaceId: string;
  email: string;
  invitedBy: string;
  role?: "member";
  expiresAt?: Date;
  status?: "pending" | "accepted" | "expired" | "cancelled";
  id?: string;
  token?: string;
}) {
  const inviteId = options.id || ulid();
  const token = options.token || randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);

  const [createdInvite] = await db
    .insert(workspaceInvite)
    .values({
      id: inviteId,
      workspaceId: options.workspaceId,
      email: options.email,
      invitedBy: options.invitedBy,
      role: options.role || "member",
      token: tokenHash,
      expiresAt: options.expiresAt,
      status: options.status || "pending",
    })
    .returning();

  // Return with the original token (not hash) for testing
  return { ...createdInvite, token };
}

export async function cleanupTestData(userIds: string[]) {
  for (const userId of userIds) {
    await db.delete(userPreferences).where(eq(userPreferences.userId, userId));
    await db.delete(account).where(eq(account.userId, userId));
    await db.delete(workspace).where(eq(workspace.ownerId, userId));
    await db.delete(user).where(eq(user.id, userId));
  }
}
