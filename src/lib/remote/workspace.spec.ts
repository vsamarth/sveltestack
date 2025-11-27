import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createWorkspace,
  updateWorkspace,
  deleteWorkspace,
  setLastActiveWorkspace,
} from "./workspace";
import { createTestUser, createTestWorkspace, createTestMember, cleanupTestData } from "../../../tests/helpers/test-db";
import { createMockRequestEvent } from "../../../tests/helpers/mock-request";
import { getWorkspaces, getWorkspaceById } from "$lib/server/db/workspace";

// Mock $app/server
const mockGetRequestEvent = vi.fn();
vi.mock("$app/server", () => ({
  command: (schema: unknown, handler: unknown) => handler,
  getRequestEvent: () => mockGetRequestEvent(),
}));

describe("workspace integration tests", () => {
  let testUser1: Awaited<ReturnType<typeof createTestUser>>;
  let testUser2: Awaited<ReturnType<typeof createTestUser>>;
  let userIds: string[] = [];

  beforeEach(async () => {
    testUser1 = await createTestUser({ name: "Workspace Owner" });
    testUser2 = await createTestUser({ name: "Other User" });
    userIds = [testUser1.id, testUser2.id];
  });

  afterEach(async () => {
    await cleanupTestData(userIds);
    vi.clearAllMocks();
  });

  // Helper functions
  const createTestWorkspaceHelper = (name = "Test Workspace") => createTestWorkspace({ name, ownerId: testUser1.id });
  
  const expectError = async (fn: () => Promise<unknown>, expectedStatus: number | number[]) => {
    try {
      await fn();
      expect.fail("Should have thrown error");
    } catch (err) {
      const status = (err as { status: number }).status;
      if (Array.isArray(expectedStatus)) {
        expect(expectedStatus).toContain(status);
      } else {
        expect(status).toBe(expectedStatus);
      }
    }
  };

  describe("createWorkspace", () => {
    it("should successfully create workspace with authenticated user", async () => {
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      const result = await createWorkspace("My Workspace");

      expect(result).toMatchObject({
        id: expect.any(String),
        name: "My Workspace",
      });

      const workspaces = await getWorkspaces(testUser1.id);
      expect(workspaces).toHaveLength(1);
      expect(workspaces[0].name).toBe("My Workspace");
    });
  });

  describe("updateWorkspace", () => {
    it("should update workspace name when user is owner", async () => {
      const workspace = await createTestWorkspaceHelper("Original Name");
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      const result = await updateWorkspace({
        workspaceId: workspace.id,
        name: "Updated Name",
      });

      expect(result.name).toBe("Updated Name");
      expect(result.id).toBe(workspace.id);

      const updated = await getWorkspaceById(workspace.id);
      expect(updated?.name).toBe("Updated Name");
    });

    it("should return 403 when user is not owner", async () => {
      const workspace = await createTestWorkspaceHelper("Original Name");
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));

      await expectError(
        () => updateWorkspace({ workspaceId: workspace.id, name: "Updated Name" }),
        403,
      );

      const unchanged = await getWorkspaceById(workspace.id);
      expect(unchanged?.name).toBe("Original Name");
    });

    it("should return 404 when workspace doesn't exist", async () => {
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      await expectError(
        () => updateWorkspace({ workspaceId: "non-existent-id", name: "Updated Name" }),
        404,
      );
    });
  });

  describe("deleteWorkspace", () => {
    it("should delete workspace and return redirect URL when user has multiple workspaces", async () => {
      const ws1 = await createTestWorkspaceHelper("Workspace 1");
      const ws2 = await createTestWorkspaceHelper("Workspace 2");

      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      const result = await deleteWorkspace(ws1.id);

      expect(result.redirectTo).toBe(`/dashboard/workspace/${ws2.id}`);
      expect(await getWorkspaceById(ws1.id)).toBeUndefined();
      expect(await getWorkspaceById(ws2.id)).toBeDefined();
    });

    it("should return 400 when trying to delete last workspace", async () => {
      const workspace = await createTestWorkspaceHelper("Only Workspace");
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));

      await expectError(() => deleteWorkspace(workspace.id), 400);

      expect(await getWorkspaceById(workspace.id)).toBeDefined();
    });

    it("should return 403 when user is not owner", async () => {
      const workspace = await createTestWorkspaceHelper();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));

      await expectError(() => deleteWorkspace(workspace.id), 403);
      expect(await getWorkspaceById(workspace.id)).toBeDefined();
    });
  });

  describe("setLastActiveWorkspace", () => {
    it("should set last active workspace when user has access (owner or member)", async () => {
      const workspace = await createTestWorkspaceHelper();

      // Test as owner
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      expect(await setLastActiveWorkspace(workspace.id)).toEqual({ success: true });

      // Test as member
      await createTestMember({ workspaceId: workspace.id, userId: testUser2.id });
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));
      expect(await setLastActiveWorkspace(workspace.id)).toEqual({ success: true });
    });

    it("should return 403 when user doesn't have access", async () => {
      const workspace = await createTestWorkspaceHelper();
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser2));
      await expectError(() => setLastActiveWorkspace(workspace.id), 403);
    });

    it("should return 404 when workspace doesn't exist", async () => {
      mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser1));
      await expectError(() => setLastActiveWorkspace("non-existent-id"), 404);
    });
  });
});

