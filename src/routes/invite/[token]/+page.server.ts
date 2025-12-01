import {
  getInviteWithDetails,
  acceptInvite,
  cancelInvite,
} from "$lib/server/db/invite";
import { getWorkspaceById } from "$lib/server/db/workspace";
import { getWorkspaceMembers } from "$lib/server/db/membership";
import type { Actions, PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ params, locals, url }) => {
  const { token } = params;

  // Get invite details
  const invite = await getInviteWithDetails(token);

  if (!invite) {
    return {
      error: "invalid",
      message: "This invite link is invalid or has already been used.",
    };
  }

  // Check if expired
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return {
      error: "expired",
      message: "This invite has expired. Please ask for a new invitation.",
    };
  }

  // Check status
  if (invite.status !== "pending") {
    return {
      error: invite.status,
      message:
        invite.status === "accepted"
          ? "This invite has already been accepted."
          : "This invite is no longer valid.",
    };
  }

  // If user is logged in, check if they're trying to accept their own invite
  if (locals.user) {
    // Check if logged-in user's email matches invite email
    const emailMatches =
      locals.user.email.toLowerCase() === invite.email.toLowerCase();

    // If email doesn't match, treat as invalid invite to prevent information disclosure
    if (!emailMatches) {
      return {
        error: "invalid",
        message: "This invite link is invalid or has already been used.",
      };
    }

    // Get workspace member count for context
    const members = await getWorkspaceMembers(invite.workspaceId);
    const memberCount = members.length + 1; // +1 for owner

    return {
      invite: {
        workspaceName: invite.workspaceName,
        inviterName: invite.inviterName,
        inviterImage: invite.inviterImage,
        email: invite.email,
        createdAt: invite.createdAt,
        memberCount,
      },
      user: locals.user,
      emailMatches,
      token,
    };
  }

  // Not logged in - show login prompt
  // Get workspace member count for context
  const members = await getWorkspaceMembers(invite.workspaceId);
  const memberCount = members.length + 1; // +1 for owner

  return {
    invite: {
      workspaceName: invite.workspaceName,
      inviterName: invite.inviterName,
      inviterImage: invite.inviterImage,
      email: invite.email,
      createdAt: invite.createdAt,
      memberCount,
    },
    user: null,
    emailMatches: false,
    token,
    loginUrl: `/login?redirect=${encodeURIComponent(url.pathname)}`,
    registerUrl: `/register?redirect=${encodeURIComponent(url.pathname)}&email=${encodeURIComponent(invite.email)}`,
  };
};

export const actions: Actions = {
  accept: async ({ params, locals }) => {
    if (!locals.user) {
      return fail(401, { error: "You must be logged in to accept an invite" });
    }

    const { token } = params;

    try {
      // Get the invite first to validate email match (defense in depth)
      const invite = await getInviteWithDetails(token);

      if (!invite) {
        return fail(404, { error: "Invite not found" });
      }

      // Validate email match before accepting
      if (locals.user.email.toLowerCase() !== invite.email.toLowerCase()) {
        return fail(403, {
          error: "This invitation was sent to a different email address",
        });
      }

      const result = await acceptInvite(
        token,
        locals.user.id,
        locals.user.email,
      );

      // Get workspace for redirect
      const workspace = await getWorkspaceById(result.invite.workspaceId);

      if (workspace) {
        throw redirect(302, `/dashboard/workspace/${workspace.id}/files`);
      }

      return { success: true };
    } catch (err) {
      console.error("Failed to accept invite:", err);

      if (err instanceof Error) {
        if (err.message.includes("expired")) {
          return fail(400, { error: "This invite has expired" });
        }
        if (err.message.includes("not found")) {
          return fail(404, { error: "Invite not found" });
        }
        if (err.message.includes("different email address")) {
          return fail(403, {
            error: "This invitation was sent to a different email address",
          });
        }
        return fail(400, { error: err.message });
      }

      // Re-throw redirects
      throw err;
    }
  },
  decline: async ({ params, locals }) => {
    if (!locals.user) {
      return fail(401, { error: "You must be logged in to decline an invite" });
    }

    const { token } = params;

    try {
      const invite = await getInviteWithDetails(token);

      if (!invite) {
        return fail(404, { error: "Invite not found" });
      }

      if (invite.status !== "pending") {
        return fail(400, {
          error: "This invite is no longer available to decline",
        });
      }

      // Only allow declining if the invite email matches the user's email
      // (or if they're logged in, they can decline any invite sent to them)
      const emailMatches =
        locals.user.email.toLowerCase() === invite.email.toLowerCase();
      if (!emailMatches) {
        return fail(403, {
          error: "You can only decline invites sent to your email",
        });
      }

      // Cancel the invite (marking it as declined)
      await cancelInvite(invite.id, locals.user.id);

      return { success: true, declined: true };
    } catch (err) {
      console.error("Failed to decline invite:", err);
      return fail(500, { error: "Failed to decline invitation" });
    }
  },
};
