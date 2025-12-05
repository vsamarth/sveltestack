import { command } from "$app/server";
import { error } from "@sveltejs/kit";
import { ulid } from "ulid";
import { eq } from "drizzle-orm";
import z from "zod";
import crypto from "node:crypto";
import { env } from "$lib/server/env";
import { auth } from "$lib/server/auth";
import { db } from "$lib/server/db";
import { user } from "$lib/server/db/schema";
import { getWorkspaceByName } from "$lib/server/db/workspace";
import { createPendingFile, confirmFileUpload } from "$lib/server/db/file";
import { uploadFile } from "$lib/server/storage";
import { generateFileContent } from "../../../tests/fixtures/file-samples";
import { FILE_SEEDS } from "../../../tests/fixtures/file-seeds";
import { getUserByEmail } from "$lib/server/db/user";
import { WORKSPACE_CONFIG } from "../../../tests/fixtures/workspace-config";
import { acceptInvite, createInvite } from "$lib/server/db/invite";

async function seedDemoUserData(user: { id: string; email: string }) {
  const personalWorkspace = await getWorkspaceByName("Personal", user.id);
  if (!personalWorkspace) {
    throw new Error("Personal workspace not found");
  }

  // Seed files to the personal workspace
  // Combine files from default and personal seeds
  const filesToSeed = [...FILE_SEEDS.default, ...FILE_SEEDS.personal];
  await Promise.all(
    filesToSeed.map(
      async (f: { filename: string; contentType: string; size: number }) => {
        const extension = f.filename.split(".").pop() ?? "bin";
        const storageKey = `${ulid()}.${extension}`;
        await uploadFile(
          storageKey,
          generateFileContent(f.filename, f.contentType, f.size),
          f.contentType,
        );
        const pending = await createPendingFile(
          personalWorkspace.id,
          f.filename,
          storageKey,
          f.size,
          f.contentType,
        );
        return await confirmFileUpload(pending.id, user.id);
      },
    ),
  );

  const testUser = await getUserByEmail("test@example.com");
  if (!testUser) {
    throw new Error("Test user not found");
  }

  const teamWorkspace = await getWorkspaceByName(
    WORKSPACE_CONFIG.team.name,
    testUser.id,
  );
  if (!teamWorkspace) {
    throw new Error("Team Workspace not found");
  }

  const invitation = await createInvite(
    teamWorkspace.id,
    user.email,
    testUser.id,
    "member",
  );
  await acceptInvite(invitation.token, user.id, user.email);
}

function createDemoEmail() {
  const randomHex = crypto.randomBytes(3).toString("hex"); // 3 bytes = 6 hex characters
  return `demo-${randomHex}@example.com`;
}

export const loginDemo = command(z.void(), async () => {
  if (!env.ENABLE_DEMO) {
    error(404, "Demo mode is not enabled");
  }

  try {
    const session = await auth.api.signUpEmail({
      body: {
        email: createDemoEmail(),
        password: "demo@123",
        name: "Demo User",
      },
    });

    if (!session) {
      error(500, "Failed to create demo user");
    }

    // Mark email as verified
    await db
      .update(user)
      .set({ emailVerified: true })
      .where(eq(user.id, session.user.id));
    await seedDemoUserData(session.user);
  } catch (err) {
    console.error("Failed to create demo user:", err);
    if (err && (err as { status: number }).status) throw err;
    error(500, "Failed to create demo account");
  }
});
