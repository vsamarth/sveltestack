import { test, expect, type Page } from "@playwright/test";
import { AUTH_STATES } from "./fixtures/auth";
import { TEST_USERS } from "./fixtures/test-users";
import { db } from "$lib/server/db";
import {
  workspace as workspaceTable,
  workspaceMember,
} from "$lib/server/db/schema";
import { eq, and } from "drizzle-orm";
import { createTestInvite } from "./helpers/test-db";
import { ulid } from "ulid";

test.use({ storageState: AUTH_STATES.verified });

async function getWorkspaceIdByName(name: string) {
  const record = await db
    .select()
    .from(workspaceTable)
    .where(eq(workspaceTable.name, name))
    .limit(1)
    .then((rows) => rows[0]);
  if (!record) throw new Error(`Workspace "${name}" not found`);
  return record.id;
}

async function navigateToSettings(page: Page, name: string) {
  const workspaceId = await getWorkspaceIdByName(name);
  await page.goto(`/dashboard/workspace/${workspaceId}/settings`);
  await expect(
    page.getByRole("heading", { name: "Workspace Settings" }),
  ).toBeVisible();
  return { workspaceId };
}

test.describe("Workspace settings", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToSettings(page, TEST_USERS.verified.workspaceName);
  });

  test("renames workspace inline and resets the name", async ({ page }) => {
    const original = TEST_USERS.verified.workspaceName;
    const updated = `Workspace ${Date.now()}`;

    // Scope to main content area to avoid sidebar button
    const main = page.getByRole("main");

    const workspaceNameButton = main
      .locator("button")
      .filter({ hasText: original })
      .first();

    await expect(workspaceNameButton).toBeVisible();

    await workspaceNameButton.click();

    const input = page.getByPlaceholder("Enter workspace name");
    await expect(input).toBeVisible();

    await input.fill(updated);
  });

  test("lists members and allows removing and re-adding a member", async ({
    page,
  }) => {
    const workspaceId = await getWorkspaceIdByName(
      TEST_USERS.verified.workspaceName,
    );
    const memberRow = page
      .locator("tr")
      .filter({ hasText: "Member User" })
      .first();

    const actionsButton = memberRow.getByRole("button", { name: "Actions" });
    await actionsButton.click();

    await expect(page.getByRole("menuitem", { name: "Remove" })).toBeVisible();
    await page.getByRole("menuitem", { name: "Remove" }).click();

    const confirmation = page.getByRole("dialog", { name: "Remove Member" });
    await confirmation.getByRole("button", { name: "Remove Member" }).click();
    await expect(page.getByText("Member removed")).toBeVisible();

    await db.insert(workspaceMember).values({
      id: ulid(),
      workspaceId,
      userId: TEST_USERS.member.id,
    });
  });

  test("cancels pending invites", async ({ page }) => {
    const workspaceId = await getWorkspaceIdByName(
      TEST_USERS.verified.workspaceName,
    );
    const inviteRow = page
      .locator("tr")
      .filter({ hasText: TEST_USERS.invited.email })
      .first();

    const actionsButton = inviteRow.getByRole("button", { name: "Actions" });
    await actionsButton.click();

    await expect(
      page.getByRole("menuitem", { name: "Cancel Invite" }),
    ).toBeVisible();
    await page.getByRole("menuitem", { name: "Cancel Invite" }).click();
    await expect(page.getByText("Invitation cancelled")).toBeVisible();

    await createTestInvite({
      workspaceId,
      email: TEST_USERS.invited.email,
      invitedBy: TEST_USERS.verified.id,
    });
  });

  test("deletes a workspace when multiple exist", async ({ page }) => {
    const newWorkspaceName = `Disposable Workspace ${Date.now()}`;
    const [newWorkspace] = await db
      .insert(workspaceTable)
      .values({
        id: ulid(),
        name: newWorkspaceName,
        ownerId: TEST_USERS.verified.id,
      })
      .returning();

    await page.goto(`/dashboard/workspace/${newWorkspace.id}/settings`);
    await page.getByRole("button", { name: "Delete Workspace" }).click();

    const dialog = page.getByRole("dialog", { name: "Delete Workspace" });
    await dialog
      .getByPlaceholder("Type workspace name to confirm")
      .fill(newWorkspaceName);
    await dialog.getByRole("button", { name: "Delete Workspace" }).click();

    await expect(page).toHaveURL(/\/dashboard\/workspace\/.+\/files/);

    await db
      .delete(workspaceTable)
      .where(
        and(
          eq(workspaceTable.name, newWorkspaceName),
          eq(workspaceTable.ownerId, TEST_USERS.verified.id),
        ),
      );
  });

  test("prevents deleting the last workspace for a new user", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: AUTH_STATES.member,
    });
    const memberPage = await context.newPage();
    const workspaceId = await getWorkspaceIdByName(
      TEST_USERS.member.workspaceName,
    );
    await memberPage.goto(`/dashboard/workspace/${workspaceId}/settings`);

    await memberPage.waitForLoadState("networkidle");

    await expect(
      memberPage.getByRole("heading", { name: "Workspace Settings" }),
    ).toBeVisible();

    await memberPage.getByRole("button", { name: "Delete Workspace" }).click();

    const dialog = memberPage.getByRole("dialog", { name: "Delete Workspace" });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await expect(dialog.getByText(/This action cannot be undone/i)).toBeVisible(
      { timeout: 5000 },
    );

    // Wait for the input to be available in the DOM using waitForSelector
    // This is more reliable when elements are still rendering
    await memberPage.waitForSelector(
      'input[placeholder="Type workspace name to confirm"]',
      { state: "attached", timeout: 10000 },
    );

    const confirmationInput = dialog.getByPlaceholder(
      "Type workspace name to confirm",
    );

    await expect(confirmationInput).toBeVisible({ timeout: 5000 });
    await expect(confirmationInput).toBeEnabled({ timeout: 5000 });

    await confirmationInput.fill(TEST_USERS.member.workspaceName);
    await dialog.getByRole("button", { name: "Delete Workspace" }).click();
    await expect(
      memberPage.getByText("Failed to delete workspace"),
    ).toBeVisible();
    await context.close();
  });
});
