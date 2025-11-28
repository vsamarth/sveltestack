import { db } from ".";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { workspaceInvite, workspaceMember, workspace, user } from "./schema";
import { randomBytes, createHash } from "node:crypto";

function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createInvite(
  workspaceId: string,
  email: string,
  invitedBy: string,
  role: "member" = "member",
  expiresAt?: Date,
) {
  // Check for existing pending invite for this email and workspace
  const existingInvite = await db
    .select({ id: workspaceInvite.id })
    .from(workspaceInvite)
    .where(
      and(
        eq(workspaceInvite.workspaceId, workspaceId),
        eq(workspaceInvite.email, email),
        eq(workspaceInvite.status, "pending"),
      ),
    )
    .limit(1);

  if (existingInvite.length > 0) {
    throw new Error("A pending invite already exists for this email");
  }

  // Generate unique token
  let token: string = "";
  let tokenHash: string = "";
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    token = generateInviteToken();
    tokenHash = hashToken(token);

    // Check if hash already exists (extremely unlikely but possible)
    const existing = await db
      .select({ id: workspaceInvite.id })
      .from(workspaceInvite)
      .where(eq(workspaceInvite.token, tokenHash))
      .limit(1);

    if (existing.length === 0) {
      break;
    }

    attempts++;
  }

  if (attempts >= maxAttempts || !tokenHash || tokenHash === "") {
    throw new Error("Failed to generate unique invite token");
  }

  const result = await db
    .insert(workspaceInvite)
    .values({
      workspaceId,
      email,
      invitedBy,
      role,
      token: tokenHash, // Store hashed token
      expiresAt,
      status: "pending",
    })
    .returning();

  // Return the invite with the original token (not the hash) for the caller
  // This allows the caller to use the token in emails/URLs
  return { ...result[0], token };
}

export async function getInviteByToken(token: string) {
  // Hash the provided token to compare with stored hash
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
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, invite.workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    )
    .limit(1);

  if (existingMember.length > 0) {
    // User is already a member, mark invite as accepted anyway
    await db
      .update(workspaceInvite)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(workspaceInvite.id, invite.id));
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

  // Update invite status
  await db
    .update(workspaceInvite)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workspaceInvite.id, invite.id));

  return { invite, membership: membership[0] };
}

export async function cancelInvite(inviteId: string) {
  const result = await db
    .update(workspaceInvite)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(workspaceInvite.id, inviteId))
    .returning();

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
