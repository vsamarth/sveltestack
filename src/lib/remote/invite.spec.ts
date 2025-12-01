import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  sendInvite,
  cancelInvite,
  getWorkspaceInvites,
  getMembers,
  removeMember,
} from "./invite";
import {
  createTestUser,
  createTestWorkspace,
  createTestMember,
  createTestInvite,
  cleanupTestData,
} from "../../../tests/helpers/test-db";
import { createMockRequestEvent } from "../../../tests/helpers/mock-request";
import { getPendingInvites } from "$lib/server/db/invite";
import { getWorkspaceMembersWithDetails } from "$lib/server/db/membership";
import { setupAllMocks } from "../../../tests/helpers/mocks";
import {
  findActivity,
  expectActivity,
} from "../../../tests/helpers/activity-helpers";

// Mock $app/server
const mockGetRequestEvent = vi.fn();
vi.mock("$app/server", () => ({
  command: (schema: unknown, handler: unknown) => handler,
  getRequestEvent: () => mockGetRequestEvent(),
}));

// Mock email and S3
setupAllMocks();

describe("invite integration tests", () => {
  let testUser1: Awaited<ReturnType<typeof createTestUser>>;
  let testUser2: Awaited<ReturnType<typeof createTestUser>>;
  let userIds: string[] = [];

  beforeEach(async () => {
    const uniqueId = Date.now().toString(36);
    testUser1 = await createTestUser({
      name: "Workspace Owner",
      email: `owner-${uniqueId}@example.com`,
    });
    testUser2 = await createTestUser({
      name: "Other User",
      email: `other-${uniqueId}@example.com`,
    });
    userIds = [testUser1.id, testUser2.id];
  });

  afterEach(async () => {
    await cleanupTestData(userIds);
    vi.clearAllMocks();
  });

  // Helper functions
  const createWorkspace = () =>
    createTestWorkspace({ name: "Test Workspace", ownerId: testUser1.id });

  const expectError = async (
    fn: () => Promise<unknown>,
    expectedStatus: number,
  ) => {
    try {
      await fn();
      expect.fail("Should have thrown error");
    } catch (err) {
      expect((err as { status: number }).status).toBe(expectedStatus);
    }
  };

  describe("sendInvite", () => {
    it("should successfully send invite when user is owner", async () => {
      const workspace = await createWorkspace();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      const result = await sendInvite({
        workspaceId: workspace.id,
        email: "newmember@example.com",
      });

      expect(result.success).toBe(true);
      expect(result.inviteId).toBeDefined();

      const invites = await getPendingInvites(workspace.id);
      expect(invites).toHaveLength(1);
      expect(invites[0].email).toBe("newmember@example.com");
    });

    it("should log invite.sent activity", async () => {
      const workspace = await createWorkspace();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      const result = await sendInvite({
        workspaceId: workspace.id,
        email: "newmember@example.com",
      });
      const activity = await findActivity(workspace.id, "invite.sent");
      expectActivity(activity, {
        actorId: testUser1.id,
        eventType: "invite.sent",
        entityType: "invite",
        entityId: result.inviteId,
        metadataFields: ["inviteEmail", "role"],
      });
    });

    it("should create invite with 7-day expiration", async () => {
      const workspace = await createWorkspace();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      await sendInvite({
        workspaceId: workspace.id,
        email: "newmember@example.com",
      });

      const invites = await getPendingInvites(workspace.id);
      const expiresAt = invites[0].expiresAt;
      expect(expiresAt).toBeDefined();
      if (expiresAt) {
        const daysUntilExpiry = Math.ceil(
          (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
        );
        expect(daysUntilExpiry).toBe(7);
      }
    });

    it("should return 400 when trying to invite self or duplicate invite", async () => {
      const workspace = await createWorkspace();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      // Test self-invite
      await expectError(
        () => sendInvite({ workspaceId: workspace.id, email: testUser1.email }),
        400,
      );

      // Test duplicate invite
      await createTestInvite({
        workspaceId: workspace.id,
        email: "existing@example.com",
        invitedBy: testUser1.id,
        status: "pending",
      });

      await expectError(
        () =>
          sendInvite({
            workspaceId: workspace.id,
            email: "existing@example.com",
          }),
        400,
      );
    });

    it("should return 403 when user is not owner", async () => {
      const workspace = await createWorkspace();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));

      await expectError(
        () =>
          sendInvite({
            workspaceId: workspace.id,
            email: "newmember@example.com",
          }),
        403,
      );
    });

    it("should return 404 when workspace doesn't exist", async () => {
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      await expectError(
        () =>
          sendInvite({
            workspaceId: "non-existent-id",
            email: "newmember@example.com",
          }),
        404,
      );
    });
  });

  describe("cancelInvite", () => {
    it("should cancel invite when user is owner", async () => {
      const workspace = await createWorkspace();
      const invite = await createTestInvite({
        workspaceId: workspace.id,
        email: "member@example.com",
        invitedBy: testUser1.id,
        status: "pending",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      const result = await cancelInvite(invite.id);

      expect(result.success).toBe(true);
      const invites = await getPendingInvites(workspace.id);
      expect(invites).toHaveLength(0);
    });

    it("should log invite.cancelled activity", async () => {
      const workspace = await createWorkspace();
      const invite = await createTestInvite({
        workspaceId: workspace.id,
        email: "member@example.com",
        invitedBy: testUser1.id,
        status: "pending",
      });
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      await cancelInvite(invite.id);
      const activity = await findActivity(workspace.id, "invite.cancelled");
      expectActivity(activity, {
        actorId: testUser1.id,
        eventType: "invite.cancelled",
        entityType: "invite",
        entityId: invite.id,
        metadataFields: ["inviteEmail"],
      });
    });

    it("should return 403 when user is not owner", async () => {
      const workspace = await createWorkspace();
      const invite = await createTestInvite({
        workspaceId: workspace.id,
        email: "member@example.com",
        invitedBy: testUser1.id,
        status: "pending",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));

      await expectError(() => cancelInvite(invite.id), 403);
    });

    it("should return 404 when invite doesn't exist", async () => {
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      await expectError(() => cancelInvite("non-existent-id"), 404);
    });
  });

  describe("getWorkspaceInvites", () => {
    it("should return only pending invites when user is owner", async () => {
      const workspace = await createWorkspace();
      await createTestInvite({
        workspaceId: workspace.id,
        email: "pending1@example.com",
        invitedBy: testUser1.id,
        status: "pending",
      });
      await createTestInvite({
        workspaceId: workspace.id,
        email: "pending2@example.com",
        invitedBy: testUser1.id,
        status: "pending",
      });
      await createTestInvite({
        workspaceId: workspace.id,
        email: "cancelled@example.com",
        invitedBy: testUser1.id,
        status: "cancelled",
      });
      await createTestInvite({
        workspaceId: workspace.id,
        email: "expired@example.com",
        invitedBy: testUser1.id,
        status: "expired",
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      const invites = await getWorkspaceInvites(workspace.id);

      expect(invites).toHaveLength(2);
      expect(invites.every((inv) => inv.status === "pending")).toBe(true);
    });

    it("should return 403 when user is not owner", async () => {
      const workspace = await createWorkspace();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));
      await expectError(() => getWorkspaceInvites(workspace.id), 403);
    });
  });

  describe("getMembers", () => {
    it("should return members when user has access (owner or member)", async () => {
      const workspace = await createWorkspace();
      await createTestMember({
        workspaceId: workspace.id,
        userId: testUser2.id,
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      const membersAsOwner = await getMembers(workspace.id);
      expect(membersAsOwner.length).toBeGreaterThan(0);

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));
      const membersAsMember = await getMembers(workspace.id);
      expect(membersAsMember.length).toBeGreaterThan(0);
    });

    it("should return 403 when user has no access", async () => {
      const workspace = await createWorkspace();
      const testUser3 = await createTestUser({ name: "No Access User" });
      userIds.push(testUser3.id);

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser3));
      await expectError(() => getMembers(workspace.id), 403);
    });
  });

  describe("removeMember", () => {
    it("should remove member when user is owner", async () => {
      const workspace = await createWorkspace();
      await createTestMember({
        workspaceId: workspace.id,
        userId: testUser2.id,
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      const result = await removeMember({
        workspaceId: workspace.id,
        userId: testUser2.id,
      });

      expect(result.success).toBe(true);
      const members = await getWorkspaceMembersWithDetails(workspace.id);
      expect(members.find((m) => m.userId === testUser2.id)).toBeUndefined();
    });

    it("should log member.removed activity", async () => {
      const workspace = await createWorkspace();
      await createTestMember({
        workspaceId: workspace.id,
        userId: testUser2.id,
      });
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      await removeMember({
        workspaceId: workspace.id,
        userId: testUser2.id,
      });
      const activity = await findActivity(workspace.id, "member.removed");
      expectActivity(activity, {
        actorId: testUser1.id,
        eventType: "member.removed",
        entityType: "member",
        entityId: testUser2.id,
        metadataFields: ["memberEmail", "memberName"],
      });
    });

    it("should return 403 when user is not owner", async () => {
      const workspace = await createWorkspace();
      await createTestMember({
        workspaceId: workspace.id,
        userId: testUser2.id,
      });

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));
      await expectError(
        () => removeMember({ workspaceId: workspace.id, userId: testUser2.id }),
        403,
      );
    });

    it("should return 400 when trying to remove owner", async () => {
      const workspace = await createWorkspace();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      await expectError(
        () => removeMember({ workspaceId: workspace.id, userId: testUser1.id }),
        400,
      );
    });
  });
});
