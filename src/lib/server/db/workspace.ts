import { db } from ".";
import { and, eq } from "drizzle-orm";
import { userPreferences, workspace } from "./schema";
import * as events from "../events";

export async function createDefaultWorkspace(userId: string) {
  const newWorkspace = await createWorkspace("Personal", userId);
  await setLastActiveWorkspace(userId, newWorkspace.id);
}

export async function getWorkspaces(userId: string) {
  return await db
    .select()
    .from(workspace)
    .where(eq(workspace.ownerId, userId))
    .orderBy(workspace.createdAt);
}

export async function getWorkspaceById(workspaceId: string) {
  return await db
    .select()
    .from(workspace)
    .where(eq(workspace.id, workspaceId))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function userOwnsWorkspace(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(and(eq(workspace.id, workspaceId), eq(workspace.ownerId, userId)))
    .limit(1);

  return result.length > 0;
}

export async function createWorkspace(name: string, userId: string) {
  const result = await db
    .insert(workspace)
    .values({
      name,
      ownerId: userId,
    })
    .returning();

  const newWorkspace = result[0];
  await events.onWorkspaceCreated(newWorkspace.id, userId);

  return newWorkspace;
}

export async function updateWorkspace(
  workspaceId: string,
  name: string,
  userId: string,
) {
  const oldWorkspace = await getWorkspaceById(workspaceId);
  if (!oldWorkspace) {
    throw new Error("Workspace not found");
  }

  const result = await db
    .update(workspace)
    .set({ name })
    .where(eq(workspace.id, workspaceId))
    .returning();

  const updated = result[0];
  await events.onWorkspaceRenamed(
    workspaceId,
    userId,
    oldWorkspace.name,
    updated.name,
  );

  return updated;
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
