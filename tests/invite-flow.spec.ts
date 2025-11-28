import { test, expect } from "@playwright/test";
import { AUTH_STATES } from "./fixtures/auth";
import { TEST_USERS } from "./fixtures/test-users";
import { db } from "$lib/server/db";
import {
  workspaceInvite,
  workspaceMember,
  workspace as workspaceTable,
} from "$lib/server/db/schema";
import { and, eq } from "drizzle-orm";
import {
  createTestInvite,
  createTestUser,
  cleanupTestData,
} from "./helpers/test-db";

test.use({ storageState: AUTH_STATES.verified });

async function getWorkspaceIdByName(name: string) {
  const record = await db
    .select({ id: workspaceTable.id })
    .from(workspaceTable)
    .where(eq(workspaceTable.name, name))
    .limit(1)
    .then((rows) => rows[0]);
  if (!record) throw new Error(`Workspace "${name}" not found`);
  return record.id;
}

async function deleteInviteByEmail(email: string) {
  await db.delete(workspaceInvite).where(eq(workspaceInvite.email, email));
}

test.describe("Invite flow", () => {
  test("owner sends invite via dialog and sees it in pending list", async ({
    page,
  }) => {
    const workspaceId = await getWorkspaceIdByName(
      TEST_USERS.verified.workspaceName,
    );
    const inviteEmail = `invitee-${Date.now()}@example.com`;
    await page.goto(`/dashboard/workspace/${workspaceId}/settings`);
    await page.getByRole("button", { name: "Invite Member" }).click();
    const dialog = page.getByRole("dialog", { name: "Invite Member" });
    await dialog.getByLabel("Email").fill(inviteEmail);
    await dialog.getByRole("button", { name: "Send Invitation" }).click();

    // Wait for the toast notification
    await expect(page.getByText("Invitation sent")).toBeVisible();

    // Wait for the dialog to close
    await expect(dialog).not.toBeVisible();

    // Wait for the pending invites section heading to appear (if it wasn't already visible)
    // This ensures the section has rendered
    const pendingInvitesHeading = page.getByRole("heading", {
      name: "Pending Invites",
    });
    await expect(pendingInvitesHeading).toBeVisible({ timeout: 5000 });

    // Find the table row containing the invite email
    // Look for a table row in tbody that contains the email address
    // Use a more specific locator to avoid matching the toast message
    const inviteRow = page
      .locator("tbody tr")
      .filter({ hasText: inviteEmail })
      .first();
    await expect(inviteRow).toBeVisible({ timeout: 10000 });

    // Verify the email appears in the row cell (not just anywhere in the row)
    // The email should be in a table cell, so we can be more specific
    const emailCell = inviteRow.locator("td").filter({ hasText: inviteEmail });
    await expect(
      emailCell.getByText(inviteEmail, { exact: true }),
    ).toBeVisible();

    await deleteInviteByEmail(inviteEmail);
  });

  test("invitee accepts invitation and appears in member list", async ({
    page,
    browser,
  }) => {
    const workspaceId = await getWorkspaceIdByName(
      TEST_USERS.verified.workspaceName,
    );
    const inviteeEmail = `accepted-${Date.now()}@example.com`;
    const invitee = await createTestUser({
      email: inviteeEmail,
      name: "Invitee User",
    });

    const invite = await createTestInvite({
      workspaceId,
      email: inviteeEmail,
      invitedBy: TEST_USERS.verified.id,
    });

    const context = await browser.newContext();
    const inviteePage = await context.newPage();

    await inviteePage.goto("/login");

    // Wait for the login form to be ready
    await expect(inviteePage.getByLabel("Email")).toBeVisible({
      timeout: 10000,
    });
    await inviteePage.getByLabel("Email").fill(inviteeEmail);
    await inviteePage.getByLabel("Password").fill("password123");
    await Promise.all([
      inviteePage.waitForURL(/\/dashboard/),
      inviteePage.getByRole("button", { name: "Sign in" }).click(),
    ]);

    await inviteePage.goto(`/invite/${invite.token}`);
    await inviteePage
      .getByRole("button", { name: "Accept Invitation" })
      .click();
    await inviteePage.waitForURL(/\/dashboard\/workspace\/.+\/files/);

    // Navigate to settings and wait for the page to load
    await page.goto(`/dashboard/workspace/${workspaceId}/settings`);

    // Wait for the members section heading to appear
    await expect(page.getByRole("heading", { name: "Members" })).toBeVisible();

    // Find the table row containing the invitee's name
    // Look for a table row in tbody that contains the member's name
    const memberRow = page
      .locator("tbody tr")
      .filter({ hasText: invitee.name })
      .first();
    await expect(memberRow).toBeVisible({ timeout: 10000 });

    // Verify the member name appears in the row
    await expect(
      memberRow.getByText(invitee.name, { exact: true }),
    ).toBeVisible();

    // Verify the member email appears in the row
    await expect(
      memberRow.getByText(inviteeEmail, { exact: true }),
    ).toBeVisible();

    await context.close();
    await db
      .delete(workspaceMember)
      .where(
        and(
          eq(workspaceMember.workspaceId, workspaceId),
          eq(workspaceMember.userId, invitee.id),
        ),
      );
    await deleteInviteByEmail(inviteeEmail);
    await cleanupTestData([invitee.id]);
  });
});
