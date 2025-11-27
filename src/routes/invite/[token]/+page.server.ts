import { getInviteWithDetails, acceptInvite } from "$lib/server/db/invite";
import { getWorkspaceById } from "$lib/server/db/workspace";
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

    return {
      invite: {
        workspaceName: invite.workspaceName,
        inviterName: invite.inviterName,
        email: invite.email,
      },
      user: locals.user,
      emailMatches,
      token,
    };
  }

  // Not logged in - show login prompt
  return {
    invite: {
      workspaceName: invite.workspaceName,
      inviterName: invite.inviterName,
      email: invite.email,
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
      const result = await acceptInvite(token, locals.user.id);

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
        return fail(400, { error: err.message });
      }

      // Re-throw redirects
      throw err;
    }
  },
};
