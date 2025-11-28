import { test, expect, type Page } from "@playwright/test";
import { AUTH_STATES } from "./fixtures/auth";
import { TEST_USERS } from "./fixtures/test-users";
import { createTestUser, cleanupTestData } from "./helpers/test-db";
import { db } from "$lib/server/db";
import { workspace } from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";

// Reset storage state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } });

async function getWorkspaceIdByName(name: string) {
  const record = await db
    .select()
    .from(workspace)
    .where(eq(workspace.name, name))
    .limit(1)
    .then((rows) => rows[0]);
  if (!record) {
    throw new Error(`Workspace "${name}" not found`);
  }
  return record.id;
}

test.describe("Workspace navigation and creation", () => {
  test.describe("empty dashboard experience", () => {
    const tempUserIds: string[] = [];

    test.afterEach(async () => {
      if (tempUserIds.length) {
        await cleanupTestData([...tempUserIds]);
        tempUserIds.length = 0;
      }
    });

    test("creates first workspace from the empty dashboard state", async ({
      page,
    }) => {
      const user = await createTestUser({ name: "Workspace Creator" });
      tempUserIds.push(user.id);

      await page.goto("/login");
      await page.getByLabel("Email").fill(user.email);
      await page.getByLabel("Password").fill("password123");

      await Promise.all([
        page.waitForURL("/dashboard"),
        page.getByRole("button", { name: "Sign in" }).click(),
      ]);

      await expect(page.getByText("No Workspaces Yet")).toBeVisible();
      await page.getByRole("button", { name: "Create Your First Workspace" }).click();

      const dialog = page.getByRole("dialog", { name: "Create Workspace" });
      await dialog.getByLabel("Name").fill("First Workspace");
      await dialog.getByRole("button", { name: "Create" }).click();

      await page.waitForURL(/\/dashboard\/workspace\/.+\/files/);
      await expect(page.getByText("Files")).toBeVisible();
      await expect(page.getByRole("button", { name: "First Workspace" })).toBeVisible();
    });
  });

  test.describe("existing user workflows", () => {
    test.use({ storageState: AUTH_STATES.verified });

    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard");
      await page.waitForURL(/\/dashboard\/workspace\/.+\/files/);
    });

    async function deleteWorkspaceByName(name: string) {
      await db
        .delete(workspace)
        .where(
          and(
            eq(workspace.name, name),
            eq(workspace.ownerId, TEST_USERS.verified.id),
          ),
        );
    }

    test.afterEach(async () => {
      await deleteWorkspaceByName("Sidebar Created Workspace");
    });

    test("creates a workspace from the sidebar dialog", async ({ page }) => {
      await page.getByRole("button", { name: "Add Workspace" }).click();

      const dialog = page.getByRole("dialog", { name: "Create Workspace" });
      await dialog.getByLabel("Name").fill("Sidebar Created Workspace");
      await dialog.getByRole("button", { name: "Create" }).click();

      await page.waitForURL(/\/dashboard\/workspace\/.+\/files/);
      await expect(page.getByRole("button", { name: "Sidebar Created Workspace" })).toBeVisible();

      await expect(dialog).not.toBeVisible();
    });

    async function selectWorkspace(
      page: Page,
      workspaceName: string,
      subPage: "files" | "settings" = "files",
    ) {
      const workspaceId = await getWorkspaceIdByName(workspaceName);
      await page.getByRole("button", { name: workspaceName }).first().click();
      await page
        .locator(
          `a[href="/dashboard/workspace/${workspaceId}/${subPage}"]`,
        )
        .click();
      return workspaceId;
    }

    test("navigates between workspaces via the sidebar", async ({ page }) => {
      const workspaceId = await selectWorkspace(page, "Team Workspace", "files");
      await expect(page).toHaveURL(
        new RegExp(`/dashboard/workspace/${workspaceId}/files`),
      );
    });

    test("remembers last active workspace on dashboard redirect", async ({ page }) => {
      const workspaceId = await selectWorkspace(page, "Team Workspace", "files");
      await page.goto("/dashboard");
      await page.waitForURL(/\/dashboard\/workspace\/.+\/files/);

      expect(page.url()).toContain(`/dashboard/workspace/${workspaceId}/files`);
    });
  });
});

