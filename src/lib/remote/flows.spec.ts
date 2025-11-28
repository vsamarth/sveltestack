import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  setLastActiveWorkspace,
} from "./workspace";
import { sendInvite, getMembers, removeMember } from "./invite";
import { getPresignedUploadUrlRemote, confirmUpload } from "./upload";
import {
  deleteFile,
  renameFile,
  getFilePreviewUrl,
  getFileDownloadUrl,
} from "./file";
import {
  createTestUser,
  createTestWorkspace,
  createTestMember,
  createTestFile,
  createTestInvite,
  cleanupTestData,
} from "../../../tests/helpers/test-db";
import { createMockRequestEvent } from "../../../tests/helpers/mock-request";
import { acceptInvite } from "$lib/server/db/invite";
import {
  getWorkspaces,
  getLastActiveWorkspace,
} from "$lib/server/db/workspace";
import { setupAllMocks } from "../../../tests/helpers/mocks";

// Mock $app/server
const mockGetRequestEvent = vi.fn();
vi.mock("$app/server", () => ({
  command: (schema: unknown, handler: unknown) => handler,
  getRequestEvent: () => mockGetRequestEvent(),
}));

// Mock S3 and email
setupAllMocks();

describe("critical flows integration tests", () => {
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
      name: "Member User",
      email: `member-${uniqueId}@example.com`,
    });
    userIds = [testUser1.id, testUser2.id];
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await cleanupTestData(userIds);
    vi.clearAllMocks();
  });

  // Helper functions
  const createWorkspaceHelper = (name = "Test Workspace") =>
    createTestWorkspace({ name, ownerId: testUser1.id });

  const asOwner = () => {
    mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
  };

  const asMember = () => {
    mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));
  };

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

  const createTestFileHelper = (
    workspaceId: string,
    filename: string,
    status: "pending" | "completed" = "completed",
  ) => createTestFile({ workspaceId, filename, status });

  describe("Workspace Creation → Invite → Acceptance Flow", () => {
    it("should complete full flow: create workspace, invite member, accept invite, access files", async () => {
      // Step 1: Owner creates workspace
      asOwner();
      const workspace = await createWorkspace("Team Workspace");
      expect(workspace.name).toBe("Team Workspace");

      // Step 2: Owner invites member
      const inviteResult = await sendInvite({
        workspaceId: workspace.id,
        email: testUser2.email,
      });
      expect(inviteResult.success).toBe(true);

      // Step 3: Member accepts invite (via database function)
      const invite = await createTestInvite({
        workspaceId: workspace.id,
        email: testUser2.email,
        invitedBy: testUser1.id,
        status: "pending",
      });
      const acceptResult = await acceptInvite(
        invite.token,
        testUser2.id,
        testUser2.email,
      );
      expect(acceptResult.membership).toBeDefined();

      // Step 4: Member can access workspace files
      const file = await createTestFileHelper(workspace.id, "shared-file.txt");

      asMember();
      const previewUrl = await getFilePreviewUrl(file.id);
      expect(previewUrl.url).toBeDefined();

      // Step 5: Owner can see member in member list
      asOwner();
      const members = await getMembers(workspace.id);
      expect(members.some((m) => m.userId === testUser2.id)).toBe(true);
    });
  });

  describe("File Upload → Delete Flow", () => {
    it("should complete full flow: get upload URL, confirm upload, get URLs, delete", async () => {
      const workspace = await createWorkspaceHelper();

      // Step 1: User gets presigned upload URL
      asOwner();
      const uploadResult = await getPresignedUploadUrlRemote({
        filename: "test-file.txt",
        contentType: "text/plain",
        workspaceId: workspace.id,
        size: 1024,
      });
      expect(uploadResult.url).toBeDefined();
      expect(uploadResult.fileId).toBeDefined();

      // Step 2: User confirms upload
      const confirmResult = await confirmUpload({
        fileId: uploadResult.fileId,
      });
      expect(confirmResult.success).toBe(true);
      expect(confirmResult.file?.status).toBe("completed");

      // Step 3: User can get preview/download URLs
      const previewUrl = await getFilePreviewUrl(uploadResult.fileId);
      expect(previewUrl.url).toBeDefined();

      const downloadUrl = await getFileDownloadUrl(uploadResult.fileId);
      expect(downloadUrl.url).toBeDefined();

      // Step 4: User can delete file
      const deleteResult = await deleteFile(uploadResult.fileId);
      expect(deleteResult.success).toBe(true);

      // Step 5: Deleted file cannot be accessed
      await expectError(() => getFilePreviewUrl(uploadResult.fileId), 410);
    });
  });

  describe("Workspace Management Flow", () => {
    it("should complete full flow: create multiple workspaces, set active, update, delete", async () => {
      // Step 1: User creates multiple workspaces
      asOwner();
      const ws1 = await createWorkspace("Workspace 1");
      const ws2 = await createWorkspace("Workspace 2");
      const ws3 = await createWorkspace("Workspace 3");

      const workspaces = await getWorkspaces(testUser1.id);
      expect(workspaces.length).toBe(3);

      // Step 2: User sets last active workspace
      await setLastActiveWorkspace(ws2.id);
      const lastActive = await getLastActiveWorkspace(testUser1.id);
      expect(lastActive?.id).toBe(ws2.id);

      // Step 3: User updates workspace name
      const updated = await updateWorkspace({
        workspaceId: ws1.id,
        name: "Updated Workspace 1",
      });
      expect(updated.name).toBe("Updated Workspace 1");

      // Step 4: User deletes workspace (with multiple workspaces)
      const deleteResult = await deleteWorkspace(ws3.id);
      expect(deleteResult.redirectTo).toBeDefined();

      // Verify workspace was deleted
      const remainingWorkspaces = await getWorkspaces(testUser1.id);
      expect(remainingWorkspaces.length).toBe(2);
      expect(remainingWorkspaces.find((w) => w.id === ws3.id)).toBeUndefined();

      // Step 5: User cannot delete last workspace
      // Delete one more to get to last workspace
      await deleteWorkspace(ws2.id);
      await expectError(() => deleteWorkspace(ws1.id), 400);
    });
  });

  describe("Permission Enforcement Flow", () => {
    it("should enforce permissions correctly: member cannot invite, remove, or delete", async () => {
      const workspace = await createWorkspaceHelper();

      // Add member
      await createTestMember({
        workspaceId: workspace.id,
        userId: testUser2.id,
      });

      // Member cannot invite others
      asMember();
      await expectError(
        () =>
          sendInvite({
            workspaceId: workspace.id,
            email: "newmember@example.com",
          }),
        403,
      );

      // Member cannot remove other members
      const testUser3 = await createTestUser({ name: "Another Member" });
      userIds.push(testUser3.id);
      await createTestMember({
        workspaceId: workspace.id,
        userId: testUser3.id,
      });

      await expectError(
        () => removeMember({ workspaceId: workspace.id, userId: testUser3.id }),
        403,
      );

      // Member cannot delete workspace
      await expectError(() => deleteWorkspace(workspace.id), 403);

      // Member can access files in workspace
      const file = await createTestFileHelper(workspace.id, "shared-file.txt");

      const previewUrl = await getFilePreviewUrl(file.id);
      expect(previewUrl.url).toBeDefined();

      // Member can rename files
      const renameResult = await renameFile({
        fileId: file.id,
        newFilename: "renamed-file.txt",
      });
      expect(renameResult.success).toBe(true);
    });

    it("should prevent non-member from accessing workspace", async () => {
      const workspace = await createWorkspaceHelper();
      const file = await createTestFileHelper(workspace.id, "private-file.txt");

      // Non-member cannot access files or members list
      asMember();
      await expectError(() => getFilePreviewUrl(file.id), 403);
      await expectError(() => getMembers(workspace.id), 403);
    });
  });
});
