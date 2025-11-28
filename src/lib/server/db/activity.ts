import { db } from ".";
import { and, eq, desc } from "drizzle-orm";
import { workspaceActivity, user } from "./schema";
import type { WorkspaceActivityEventType } from "./schema/activity";

export interface ActivityFilters {
  eventType?: WorkspaceActivityEventType;
  entityType?: "workspace" | "file" | "member" | "invite";
  entityId?: string;
  limit?: number;
  offset?: number;
}

export async function createActivity(
  workspaceId: string,
  actorId: string,
  eventType: WorkspaceActivityEventType,
  metadata?: Record<string, unknown>,
  entityType?: "workspace" | "file" | "member" | "invite",
  entityId?: string,
) {
  const result = await db
    .insert(workspaceActivity)
    .values({
      workspaceId,
      actorId,
      eventType,
      metadata: metadata ? (metadata as Record<string, unknown>) : null,
      entityType: entityType || null,
      entityId: entityId || null,
    })
    .returning();

  return result[0];
}

export async function getWorkspaceActivities(
  workspaceId: string,
  filters?: ActivityFilters,
) {
  const conditions = [eq(workspaceActivity.workspaceId, workspaceId)];

  if (filters?.eventType) {
    conditions.push(eq(workspaceActivity.eventType, filters.eventType));
  }

  if (filters?.entityType) {
    conditions.push(eq(workspaceActivity.entityType, filters.entityType));
  }

  if (filters?.entityId) {
    conditions.push(eq(workspaceActivity.entityId, filters.entityId));
  }

  const baseQuery = db
    .select({
      id: workspaceActivity.id,
      workspaceId: workspaceActivity.workspaceId,
      actorId: workspaceActivity.actorId,
      actorName: user.name,
      actorEmail: user.email,
      actorImage: user.image,
      eventType: workspaceActivity.eventType,
      entityType: workspaceActivity.entityType,
      entityId: workspaceActivity.entityId,
      metadata: workspaceActivity.metadata,
      createdAt: workspaceActivity.createdAt,
    })
    .from(workspaceActivity)
    .innerJoin(user, eq(workspaceActivity.actorId, user.id))
    .where(and(...conditions))
    .orderBy(desc(workspaceActivity.createdAt));

  if (filters?.limit && filters?.offset !== undefined) {
    return await baseQuery.limit(filters.limit).offset(filters.offset);
  }

  if (filters?.limit) {
    return await baseQuery.limit(filters.limit);
  }

  if (filters?.offset) {
    return await baseQuery.offset(filters.offset);
  }

  return await baseQuery;
}

export async function getActivityById(activityId: string) {
  const result = await db
    .select({
      id: workspaceActivity.id,
      workspaceId: workspaceActivity.workspaceId,
      actorId: workspaceActivity.actorId,
      actorName: user.name,
      actorEmail: user.email,
      actorImage: user.image,
      eventType: workspaceActivity.eventType,
      entityType: workspaceActivity.entityType,
      entityId: workspaceActivity.entityId,
      metadata: workspaceActivity.metadata,
      createdAt: workspaceActivity.createdAt,
    })
    .from(workspaceActivity)
    .innerJoin(user, eq(workspaceActivity.actorId, user.id))
    .where(eq(workspaceActivity.id, activityId))
    .limit(1);

  return result[0];
}

// Helper functions for specific event types

export async function logWorkspaceCreated(
  workspaceId: string,
  actorId: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "workspace.created",
    undefined,
    "workspace",
    workspaceId,
  );
}

export async function logWorkspaceRenamed(
  workspaceId: string,
  actorId: string,
  oldName: string,
  newName: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "workspace.renamed",
    { oldName, newName },
    "workspace",
    workspaceId,
  );
}

export async function logWorkspaceDeleted(
  workspaceId: string,
  actorId: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "workspace.deleted",
    undefined,
    "workspace",
    workspaceId,
  );
}

export async function logFileUploaded(
  workspaceId: string,
  actorId: string,
  fileId: string,
  filename: string,
  size?: string,
  contentType?: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "file.uploaded",
    { filename, size, contentType },
    "file",
    fileId,
  );
}

export async function logFileRenamed(
  workspaceId: string,
  actorId: string,
  fileId: string,
  oldFilename: string,
  newFilename: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "file.renamed",
    { oldFilename, newFilename },
    "file",
    fileId,
  );
}

export async function logFileDeleted(
  workspaceId: string,
  actorId: string,
  fileId: string,
  filename: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "file.deleted",
    { filename },
    "file",
    fileId,
  );
}

export async function logFileDownloaded(
  workspaceId: string,
  actorId: string,
  fileId: string,
  filename: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "file.downloaded",
    { filename },
    "file",
    fileId,
  );
}

export async function logMemberAdded(
  workspaceId: string,
  actorId: string,
  memberId: string,
  memberEmail: string,
  memberName: string,
  role: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "member.added",
    { memberEmail, memberName, role },
    "member",
    memberId,
  );
}

export async function logMemberRemoved(
  workspaceId: string,
  actorId: string,
  memberId: string,
  memberEmail: string,
  memberName: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "member.removed",
    { memberEmail, memberName },
    "member",
    memberId,
  );
}

export async function logInviteSent(
  workspaceId: string,
  actorId: string,
  inviteId: string,
  inviteEmail: string,
  role: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "invite.sent",
    { inviteEmail, role },
    "invite",
    inviteId,
  );
}

export async function logInviteAccepted(
  workspaceId: string,
  actorId: string,
  inviteId: string,
  inviteEmail: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "invite.accepted",
    { inviteEmail },
    "invite",
    inviteId,
  );
}

export async function logInviteCancelled(
  workspaceId: string,
  actorId: string,
  inviteId: string,
  inviteEmail: string,
) {
  return createActivity(
    workspaceId,
    actorId,
    "invite.cancelled",
    { inviteEmail },
    "invite",
    inviteId,
  );
}

