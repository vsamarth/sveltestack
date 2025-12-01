import { db } from ".";
import { and, eq } from "drizzle-orm";
import { workspaceMember, workspace, user } from "./schema";
import { getWorkspaces } from "./workspace";
import { logMemberAdded, logMemberRemoved } from "./activity";

export async function addMember(
  workspaceId: string,
  userId: string,
  actorId: string,
  role: "member" = "member",
) {
  const userData = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!userData) {
    throw new Error("User not found");
  }

  const result = await db
    .insert(workspaceMember)
    .values({
      workspaceId,
      userId,
      role,
    })
    .returning();

  await logMemberAdded(
    workspaceId,
    actorId,
    result[0].id,
    userData.email,
    userData.name,
    role,
  );

  return result[0];
}

export async function removeMember(
  workspaceId: string,
  userId: string,
  actorId: string,
) {
  const memberDetails = await db
    .select({
      id: workspaceMember.id,
      userId: workspaceMember.userId,
      userEmail: user.email,
      userName: user.name,
    })
    .from(workspaceMember)
    .innerJoin(user, eq(workspaceMember.userId, user.id))
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);

  if (!memberDetails) {
    throw new Error("Member not found");
  }

  await db
    .delete(workspaceMember)
    .where(
      and(
        eq(workspaceMember.workspaceId, workspaceId),
        eq(workspaceMember.userId, userId),
      ),
    );

  await logMemberRemoved(
    workspaceId,
    actorId,
    userId,
    memberDetails.userEmail,
    memberDetails.userName,
  );
}

export async function getWorkspaceMembers(workspaceId: string) {
  return await db
    .select()
    .from(workspaceMember)
    .where(eq(workspaceMember.workspaceId, workspaceId))
    .orderBy(workspaceMember.createdAt);
}

export async function getWorkspaceMembersWithDetails(workspaceId: string) {
  return await db
    .select({
      id: workspaceMember.id,
      userId: workspaceMember.userId,
      role: workspaceMember.role,
      createdAt: workspaceMember.createdAt,
      userName: user.name,
      userEmail: user.email,
      userImage: user.image,
    })
    .from(workspaceMember)
    .innerJoin(user, eq(workspaceMember.userId, user.id))
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
