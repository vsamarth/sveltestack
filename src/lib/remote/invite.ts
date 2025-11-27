import { command, getRequestEvent } from "$app/server";
import { error } from "@sveltejs/kit";
import z from "zod";
import {
  createInvite,
  cancelInvite as cancelInviteDb,
  getPendingInvites as getPendingInvitesDb,
} from "$lib/server/db/invite";
import {
  getWorkspaceMembersWithDetails,
  removeMember as removeMemberDb,
  isWorkspaceMember,
} from "$lib/server/db/membership";
import { getWorkspaceById, userOwnsWorkspace } from "$lib/server/db/workspace";
import { sendWorkspaceInviteEmail } from "$lib/server/email";
import { env } from "$lib/server/env";

export const sendInvite = command(
  z.object({
    workspaceId: z.string(),
    email: z.string().check(z.email()),
  }),
  async ({ workspaceId, email }) => {
    const { locals } = getRequestEvent();
    if (!locals.user) {
      error(401, "Unauthorized");
    }

    // Get workspace details first to check if it exists
    const workspace = await getWorkspaceById(workspaceId);
    if (!workspace) {
      error(404, "Workspace not found");
    }

    // Check if user owns the workspace
    const isOwner = await userOwnsWorkspace(workspaceId, locals.user.id);
    if (!isOwner) {
      error(403, "Only workspace owners can invite members");
    }

    // Check if user is trying to invite themselves
    if (email.toLowerCase() === locals.user.email.toLowerCase()) {
      error(400, "You cannot invite yourself");
    }

    try {
      // Create invite with 7 day expiration
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invite = await createInvite(
        workspaceId,
        email.toLowerCase(),
        locals.user.id,
        "member",
        expiresAt,
      );

      // Build invite URL
      const baseUrl =
        env.NODE_ENV === "production"
          ? "https://sveltestack.dev"
          : "http://localhost:5173";
      const inviteUrl = `${baseUrl}/invite/${invite.token}`;

      // Send email
      await sendWorkspaceInviteEmail({
        email: email.toLowerCase(),
        url: inviteUrl,
        workspaceName: workspace.name,
        inviterName: locals.user.name,
      });

      return {
        success: true,
        inviteId: invite.id,
      };
    } catch (err) {
      console.error("Failed to send invite:", err);
      if (err instanceof Error && err.message.includes("pending invite")) {
        error(400, err.message);
      }
      error(500, "Failed to send invite");
    }
  },
);

export const cancelInvite = command(z.string(), async (inviteId) => {
  const { locals } = getRequestEvent();
  if (!locals.user) {
    error(401, "Unauthorized");
  }

  try {
    const cancelled = await cancelInviteDb(inviteId);
    if (!cancelled) {
      error(404, "Invite not found");
    }

    // Verify user owns the workspace
    const isOwner = await userOwnsWorkspace(
      cancelled.workspaceId,
      locals.user.id,
    );
    if (!isOwner) {
      error(403, "Only workspace owners can cancel invites");
    }

    return { success: true };
  } catch (err) {
    console.error("Failed to cancel invite:", err);
    if (err && (err as { status: number }).status) throw err;
    error(500, "Failed to cancel invite");
  }
});

export const getWorkspaceInvites = command(z.string(), async (workspaceId) => {
  const { locals } = getRequestEvent();
  if (!locals.user) {
    error(401, "Unauthorized");
  }

  // Check if user owns the workspace
  const isOwner = await userOwnsWorkspace(workspaceId, locals.user.id);
  if (!isOwner) {
    error(403, "Only workspace owners can view invites");
  }

  try {
    const invites = await getPendingInvitesDb(workspaceId);
    return invites;
  } catch (err) {
    console.error("Failed to get invites:", err);
    error(500, "Failed to get invites");
  }
});

export const getMembers = command(z.string(), async (workspaceId) => {
  const { locals } = getRequestEvent();
  if (!locals.user) {
    error(401, "Unauthorized");
  }

  // Check if user has access to the workspace
  const isOwner = await userOwnsWorkspace(workspaceId, locals.user.id);
  const isMember = await isWorkspaceMember(workspaceId, locals.user.id);

  if (!isOwner && !isMember) {
    error(403, "You don't have access to this workspace");
  }

  try {
    const members = await getWorkspaceMembersWithDetails(workspaceId);
    return members;
  } catch (err) {
    console.error("Failed to get members:", err);
    error(500, "Failed to get members");
  }
});

export const removeMember = command(
  z.object({
    workspaceId: z.string(),
    userId: z.string(),
  }),
  async ({ workspaceId, userId }) => {
    const { locals } = getRequestEvent();
    if (!locals.user) {
      error(401, "Unauthorized");
    }

    // Check if user owns the workspace
    const isOwner = await userOwnsWorkspace(workspaceId, locals.user.id);
    if (!isOwner) {
      error(403, "Only workspace owners can remove members");
    }

    // Prevent removing the owner
    const workspace = await getWorkspaceById(workspaceId);
    if (workspace && workspace.ownerId === userId) {
      error(400, "Cannot remove the workspace owner");
    }

    try {
      await removeMemberDb(workspaceId, userId);
      return { success: true };
    } catch (err) {
      console.error("Failed to remove member:", err);
      error(500, "Failed to remove member");
    }
  },
);

