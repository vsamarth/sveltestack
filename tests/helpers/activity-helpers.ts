import { getWorkspaceActivities } from "$lib/server/db/activity";
import type { WorkspaceActivityEventType } from "$lib/server/db/schema/activity";
import { expect } from "vitest";

export async function findActivity(
  workspaceId: string,
  eventType: WorkspaceActivityEventType,
) {
  const activities = await getWorkspaceActivities(workspaceId);
  return activities.find((a) => a.eventType === eventType);
}

export function expectActivity(
  activity: Awaited<ReturnType<typeof findActivity>> | undefined,
  expected: {
    actorId: string;
    eventType: WorkspaceActivityEventType;
    entityType?: string;
    entityId?: string;
    metadataFields?: string[];
  },
) {
  expect(activity).toBeDefined();
  expect(activity?.actorId).toBe(expected.actorId);
  expect(activity?.eventType).toBe(expected.eventType);
  if (expected.entityType) {
    expect(activity?.entityType).toBe(expected.entityType);
  }
  if (expected.entityId) {
    expect(activity?.entityId).toBe(expected.entityId);
  }
  if (expected.metadataFields) {
    const metadata = activity?.metadata as Record<string, unknown> | undefined;
    expected.metadataFields.forEach((field) => {
      expect(metadata).toHaveProperty(field);
    });
  }
}
