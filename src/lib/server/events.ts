import * as activity from "./db/activity";

/**
 * This file serves as a central hub for application events in a hope to decouple database operations with side effects like logging.
 */

export async function onWorkspaceCreated(workspaceId: string, actorId: string) {
  await activity.logWorkspaceCreated(workspaceId, actorId);
}

export async function onWorkspaceRenamed(
  workspaceId: string,
  actorId: string,
  oldName: string,
  newName: string,
) {
  await activity.logWorkspaceRenamed(workspaceId, actorId, oldName, newName);
}

export async function onWorkspaceDeleted(workspaceId: string, actorId: string) {
  await activity.logWorkspaceDeleted(workspaceId, actorId);
}

export async function onFileUploaded(
  workspaceId: string,
  actorId: string,
  fileId: string,
  filename: string,
  size?: string,
  contentType?: string,
) {
  await activity.logFileUploaded(
    workspaceId,
    actorId,
    fileId,
    filename,
    size,
    contentType,
  );
}

export async function onFileRenamed(
  workspaceId: string,
  actorId: string,
  fileId: string,
  oldFilename: string,
  newFilename: string,
) {
  await activity.logFileRenamed(
    workspaceId,
    actorId,
    fileId,
    oldFilename,
    newFilename,
  );
}

export async function onFileDeleted(
  workspaceId: string,
  actorId: string,
  fileId: string,
  filename: string,
) {
  await activity.logFileDeleted(workspaceId, actorId, fileId, filename);
}

export async function onFileDownloaded(
  workspaceId: string,
  actorId: string,
  fileId: string,
  filename: string,
) {
  await activity.logFileDownloaded(workspaceId, actorId, fileId, filename);
}

export async function onMemberAdded(
  workspaceId: string,
  actorId: string,
  memberId: string,
  memberEmail: string,
  memberName: string,
  role: string,
) {
  await activity.logMemberAdded(
    workspaceId,
    actorId,
    memberId,
    memberEmail,
    memberName,
    role,
  );
}

export async function onMemberRemoved(
  workspaceId: string,
  actorId: string,
  memberId: string,
  memberEmail: string,
  memberName: string,
) {
  await activity.logMemberRemoved(
    workspaceId,
    actorId,
    memberId,
    memberEmail,
    memberName,
  );
}

export async function onInviteSent(
  workspaceId: string,
  actorId: string,
  inviteId: string,
  inviteEmail: string,
  role: string,
) {
  await activity.logInviteSent(
    workspaceId,
    actorId,
    inviteId,
    inviteEmail,
    role,
  );
}

export async function onInviteAccepted(
  workspaceId: string,
  actorId: string,
  inviteId: string,
  inviteEmail: string,
) {
  await activity.logInviteAccepted(workspaceId, actorId, inviteId, inviteEmail);
}

export async function onInviteCancelled(
  workspaceId: string,
  actorId: string,
  inviteId: string,
  inviteEmail: string,
) {
  await activity.logInviteCancelled(
    workspaceId,
    actorId,
    inviteId,
    inviteEmail,
  );
}
