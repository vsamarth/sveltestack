import { eq } from "drizzle-orm";
import { db } from "$lib/server/db";
import {
  user,
  account,
  workspace,
  userPreferences,
  workspaceMember,
  file as fileSchema,
  workspaceInvite,
  workspaceActivity,
} from "$lib/server/db/schema";
import { hash } from "$lib/server/auth/hash";
import { ulid } from "ulid";
import type { User } from "better-auth/types";
import { randomBytes, createHash } from "node:crypto";

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const findOne = async <T>(query: Promise<T[]>) => (await query)[0];

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

  const existingUser =
    (await findOne(db.select().from(user).where(eq(user.email, email)))) ||
    (options?.id
      ? await findOne(db.select().from(user).where(eq(user.id, id)))
      : null);

  if (existingUser) {
    const userId = existingUser.id;
    if (
      !(await findOne(
        db.select().from(account).where(eq(account.userId, userId)),
      ))
    ) {
      await db.insert(account).values({
        id: ulid(),
        userId,
        accountId: userId,
        providerId: "credential",
        password: await hash("password123"),
      });
    }
    if (
      !(await findOne(
        db
          .select()
          .from(userPreferences)
          .where(eq(userPreferences.userId, userId)),
      ))
    ) {
      await db.insert(userPreferences).values({ userId });
    }
    return existingUser;
  }

  const [createdUser] = await db
    .insert(user)
    .values({ id, email, name, emailVerified })
    .returning();

  await Promise.all([
    db.insert(account).values({
      id: ulid(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: await hash("password123"),
    }),
    db.insert(userPreferences).values({ userId: id }),
  ]);

  return createdUser;
}

export async function createTestWorkspace(options: {
  name: string;
  ownerId: string;
  id?: string;
}) {
  const [ws] = await db
    .insert(workspace)
    .values({
      id: options.id || ulid(),
      name: options.name,
      ownerId: options.ownerId,
    })
    .returning();
  return ws;
}

export async function createTestMember(options: {
  workspaceId: string;
  userId: string;
  role?: "member";
  id?: string;
}) {
  const [member] = await db
    .insert(workspaceMember)
    .values({
      id: options.id || ulid(),
      workspaceId: options.workspaceId,
      userId: options.userId,
      role: options.role || "member",
    })
    .returning();
  return member;
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
  const [fileRecord] = await db
    .insert(fileSchema)
    .values({
      id: options.id || ulid(),
      workspaceId: options.workspaceId,
      filename: options.filename,
      storageKey:
        options.storageKey ||
        `${ulid()}.${options.filename.split(".").pop() || "txt"}`,
      size: (options.size || 0).toString(),
      contentType: options.contentType || "application/octet-stream",
      status: options.status || "completed",
    })
    .returning();
  return fileRecord;
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
  const token = options.token || randomBytes(32).toString("base64url");
  const [invite] = await db
    .insert(workspaceInvite)
    .values({
      id: options.id || ulid(),
      workspaceId: options.workspaceId,
      email: options.email,
      invitedBy: options.invitedBy,
      role: options.role || "member",
      token: hashToken(token),
      expiresAt: options.expiresAt,
      status: options.status || "pending",
    })
    .returning();
  return { ...invite, token };
}

export async function cleanupTestData(userIds: string[]) {
  // Delete workspace_activity records first to avoid foreign key constraint violations
  await Promise.all(
    userIds.map((userId) =>
      db.delete(workspaceActivity).where(eq(workspaceActivity.actorId, userId)),
    ),
  );

  // Then delete all other related records and users
  await Promise.all(
    userIds.flatMap((userId) => [
      db.delete(workspaceMember).where(eq(workspaceMember.userId, userId)),
      db.delete(workspaceInvite).where(eq(workspaceInvite.invitedBy, userId)),
      db.delete(userPreferences).where(eq(userPreferences.userId, userId)),
      db.delete(account).where(eq(account.userId, userId)),
      db.delete(workspace).where(eq(workspace.ownerId, userId)),
      db.delete(user).where(eq(user.id, userId)),
    ]),
  );
}
