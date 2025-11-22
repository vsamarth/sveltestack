import { db } from ".";
import { eq } from "drizzle-orm";
import { userPreferences, workspace } from "./schema";

export async function createDefaultWorkspace(userId: string) {
  const newWorkspace = await db
    .insert(workspace)
    .values({
      name: "Personal",
      ownerId: userId,
    })
    .returning();

  await db.insert(userPreferences).values({
    userId,
    lastWorkspaceId: newWorkspace[0].id,
  });
}

export async function getWorkspaces(userId: string) {
  return await db.select().from(workspace).where(eq(workspace.ownerId, userId));
}

export async function getWorkspaceById(workspaceId: string) {
  return await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function createWorkspace(name: string, userId: string) {
  const result = await db
    .insert(workspace)
    .values({
      name,
      ownerId: userId,
    })
    .returning();

  return result[0];
}

export async function deleteWorkspace(workspaceId: string) {
  await db.delete(workspace).where(eq(workspace.id, workspaceId));
}

export async function getLastActiveWorkspace(userId: string) {
  const userPref = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (userPref?.lastWorkspaceId) {
    return getWorkspaceById(userPref.lastWorkspaceId);
  }

  return null;
}

export async function setLastActiveWorkspace(
  userId: string,
  workspaceId: string,
) {
  await db
    .update(userPreferences)
    .set({ lastWorkspaceId: workspaceId })
    .where(eq(userPreferences.userId, userId));
}
