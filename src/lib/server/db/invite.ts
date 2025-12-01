import { db } from ".";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import {
  workspaceInvite,
  workspaceMember,
  workspace,
  user,
  type WorkspaceInvite,
} from "./schema";
import { randomBytes, createHash } from "node:crypto";
import {
  logInviteSent,
  logInviteAccepted,
  logInviteCancelled,
  logMemberAdded,
} from "./activity";

function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type CreatedInvite = WorkspaceInvite & { token: string };

export async function createInvite(
  workspaceId: string,
  email: string,
  invitedBy: string,
  role: "member" = "member",
  expiresAt?: Date,
): Promise<CreatedInvite> {
  const normalizedEmail = email.toLowerCase();

  const workspaceRecord = await db
    .select({ id: workspace.id, ownerId: workspace.ownerId })
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!workspaceRecord) {
    throw new Error("Workspace not found");
  }

  if (workspaceRecord.ownerId !== invitedBy) {
    throw new Error("Only workspace owners can invite members");
  }

  const existingInvite = await db
    .select({ id: workspaceInvite.id })
    .from(workspaceInvite)
    .where(
      and(
        eq(workspaceInvite.workspaceId, workspaceId),
        eq(workspaceInvite.email, normalizedEmail),
        eq(workspaceInvite.status, "pending"),
      ),
    )
    .limit(1);

  if (existingInvite.length > 0) {
    throw new Error("A pending invite already exists for this email");
  }

  let token: string | null = null;
  let tokenHash: string | null = null;
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateInviteToken();
    const candidateHash = hashToken(candidate);

    const duplicateToken = await db
      .select({ id: workspaceInvite.id })
      .from(workspaceInvite)
      .where(eq(workspaceInvite.token, candidateHash))
      .limit(1);

    if (duplicateToken.length === 0) {
      token = candidate;
      tokenHash = candidateHash;
      break;
    }
  }

  if (!token || !tokenHash) {
    throw new Error("Failed to generate unique invite token");
  }

  const [invite] = await db
    .insert(workspaceInvite)
    .values({
      workspaceId,
      email: normalizedEmail,
      invitedBy,
      role,
      token: tokenHash,
      expiresAt,
      status: "pending",
    })
    .returning();

  await logInviteSent(workspaceId, invitedBy, invite.id, normalizedEmail, role);

  return { ...invite, token };
}

export async function getInviteByToken(
  token: string,
): Promise<WorkspaceInvite> {
  const tokenHash = hashToken(token);

  return await db
    .select()
    .from(workspaceInvite)
    .where(eq(workspaceInvite.token, tokenHash))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function getInviteWithDetails(token: string) {
  // Hash the provided token to compare with stored hash
  const tokenHash = hashToken(token);

  const result = await db
    .select({
      id: workspaceInvite.id,
      email: workspaceInvite.email,
      role: workspaceInvite.role,
      status: workspaceInvite.status,
      expiresAt: workspaceInvite.expiresAt,
      createdAt: workspaceInvite.createdAt,
      workspaceId: workspaceInvite.workspaceId,
      workspaceName: workspace.name,
      inviterName: user.name,
      inviterEmail: user.email,
      inviterImage: user.image,
    })
    .from(workspaceInvite)
    .innerJoin(workspace, eq(workspaceInvite.workspaceId, workspace.id))
    .innerJoin(user, eq(workspaceInvite.invitedBy, user.id))
    .where(eq(workspaceInvite.token, tokenHash))
    .limit(1);

  return result[0];
}

export async function getPendingInvites(workspaceId: string) {
  return await db
    .select()
    .from(workspaceInvite)
    .where(
      and(
        eq(workspaceInvite.workspaceId, workspaceId),
        eq(workspaceInvite.status, "pending"),
      ),
    )
    .orderBy(workspaceInvite.createdAt);
}

export async function acceptInvite(
  token: string,
  userId: string,
  userEmail: string,
) {
  // Get the invite
  const invite = await getInviteByToken(token);

  if (!invite) {
    throw new Error("Invite not found");
  }

  if (invite.status !== "pending") {
    throw new Error(`Invite is ${invite.status}`);
  }

  // Validate that the user's email matches the invite email
  if (userEmail.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error("This invitation was sent to a different email address");
  }

  // Check if invite has expired
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    // Mark as expired
    await db
      .update(workspaceInvite)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(workspaceInvite.id, invite.id));
    throw new Error("Invite has expired");
  }

  // Check if user is already a member
  const existingMember = await db
    .select()
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, invite.workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    )
    .limit(1);

  // Update invite status
  await db
    .update(workspaceInvite)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workspaceInvite.id, invite.id));

  // Log invite accepted
  await logInviteAccepted(invite.workspaceId, userId, invite.id, invite.email);

  if (existingMember.length > 0) {
    // User is already a member, don't log member.added
    return { invite, membership: existingMember[0] };
  }

  // Create membership
  const membership = await db
    .insert(workspaceMember)
    .values({
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role,
    })
    .returning();

  // Get user details for logging
  const userData = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  // Log member added (only if new membership was created)
  if (userData) {
    await logMemberAdded(
      invite.workspaceId,
      userId,
      membership[0].id,
      userData.email,
      userData.name,
      invite.role,
    );
  }

  return { invite, membership: membership[0] };
}

export async function cancelInvite(inviteId: string, actorId: string) {
  // Get invite before update to extract metadata
  const invite = await db
    .select()
    .from(workspaceInvite)
    .where(eq(workspaceInvite.id, inviteId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!invite) {
    throw new Error("Invite not found");
  }

  const workspaceRecord = await db
    .select({ ownerId: workspace.ownerId })
    .from(workspace)
    .where(eq(workspace.id, invite.workspaceId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!workspaceRecord) {
    throw new Error("Workspace not found");
  }

  if (workspaceRecord.ownerId !== actorId) {
    throw new Error("Only workspace owners can cancel invites");
  }

  const result = await db
    .update(workspaceInvite)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(workspaceInvite.id, inviteId))
    .returning();

  await logInviteCancelled(invite.workspaceId, actorId, inviteId, invite.email);

  return result[0];
}

export async function expireInvites() {
  const now = new Date();

  // Fetch pending invites that have an expiration date
  const pendingInvites = await db
    .select()
    .from(workspaceInvite)
    .where(
      and(
        eq(workspaceInvite.status, "pending"),
        isNotNull(workspaceInvite.expiresAt),
      ),
    );

  // Filter invites that have expired
  const expiredInvites = pendingInvites.filter(
    (invite) => invite.expiresAt && invite.expiresAt < now,
  );

  if (expiredInvites.length === 0) {
    return [];
  }

  // Update expired invites
  const expiredIds = expiredInvites.map((invite) => invite.id);
  const updated = await db
    .update(workspaceInvite)
    .set({ status: "expired", updatedAt: now })
    .where(inArray(workspaceInvite.id, expiredIds))
    .returning();

  return updated;
}
