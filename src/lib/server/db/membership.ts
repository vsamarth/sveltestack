import { db } from ".";
import { and, eq } from "drizzle-orm";
import { workspaceMember, workspace } from "./schema";
import { getWorkspaces } from "./workspace";

export async function addMember(
  workspaceId: string,
  userId: string,
  role: "member" = "member",
) {
  const result = await db
    .insert(workspaceMember)
    .values({
      workspaceId,
      userId,
      role,
    })
    .returning();

  return result[0];
}

export async function removeMember(workspaceId: string, userId: string) {
  await db
    .delete(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    );
}

export async function getWorkspaceMembers(workspaceId: string) {
  return await db
    .select()
    .from(workspaceMember)
    .where(eq(workspaceMember.workspaceId, workspaceId))
    .orderBy(workspaceMember.createdAt);
}

export async function isWorkspaceMember(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const result = await db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    )
    .limit(1);

  return result.length > 0;
}

export async function getUserWorkspaces(userId: string) {
  // Get workspaces where user is owner
  const ownedWorkspaces = await getWorkspaces(userId);

  // Get workspaces where user is a member
  const memberWorkspaces = await db
    .select({
      id: workspace.id,
      name: workspace.name,
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    })
    .from(workspace)
    .innerJoin(workspaceMember, eq(workspace.id, workspaceMember.workspaceId))
    .where(eq(workspaceMember.userId, userId))
    .orderBy(workspace.createdAt);

  return {
    owned: ownedWorkspaces,
    member: memberWorkspaces,
    all: [...ownedWorkspaces, ...memberWorkspaces],
  };
}

export async function hasWorkspaceAccess(
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  // Check if user owns the workspace
  const ownedWorkspace = await db
    .select({ id: workspace.id })
    .from(workspace)
    .where(and(eq(workspace.id, workspaceId), eq(workspace.ownerId, userId)))
    .limit(1);

  if (ownedWorkspace.length > 0) {
    return true;
  }

  // Check if user is a member
  return isWorkspaceMember(workspaceId, userId);
}
