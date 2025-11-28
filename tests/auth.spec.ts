import { expect, test } from "@playwright/test";
import { TEST_USERS } from "./fixtures/test-users";

// Reset storage state for this file to avoid being authenticated
test.use({ storageState: { cookies: [], origins: [] } });

// Use the verified test user for most tests
const TEST_USER = TEST_USERS.verified;

test.describe("Authentication", () => {
  test.describe("Sign In", () => {
    test("should sign in with valid credentials and redirect to dashboard", async ({
      page,
    }) => {
      await page.goto("/login");

      // Fill in sign in form with seeded test user
      await page.getByLabel("Email").fill(TEST_USER.email);
      await page.getByLabel("Password").fill(TEST_USER.password);
await  page.getByRole("button", { name: "Sign in" }).click()
await  page.waitForURL(/\/dashboard/)

      // Verify we're on the dashboard
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");

      await page.getByLabel("Email").fill(TEST_USER.email);
      await page.getByLabel("Password").fill("wrongpassword");
      await page.getByRole("button", { name: "Sign in" }).click();

      // Should show error message and stay on sign in page
      await expect(page.getByText(/incorrect|invalid|wrong/i)).toBeVisible({
        timeout: 10000,
      });
      await expect(page).toHaveURL("/login");
    });
  });

  test.describe("Sign Out", () => {
    test("should sign out and redirect to sign in page", async ({ page }) => {
      // Sign in first with the seeded test user
      await page.goto("/login");
      await page.getByLabel("Email").fill(TEST_USER.email);
      await page.getByLabel("Password").fill(TEST_USER.password);

      await Promise.all([
        page.waitForURL(/\/dashboard/, { timeout: 15000 }),
        page.getByRole("button", { name: "Sign in" }).click(),
      ]);

      // Click user menu button (shows user name)
      await page
        .getByRole("button", { name: new RegExp(TEST_USER.name, "i") })
        .click();

      // Wait for dropdown menu to appear
      const signOutButton = page.getByRole("menuitem", { name: "Sign out" });
      await expect(signOutButton).toBeVisible({ timeout: 5000 });

      // Click sign out
      await signOutButton.click();

      // Wait for redirect to sign in page
      await expect(page).toHaveURL("/login", { timeout: 10000 });
    });
  });

  test.describe("Forgot Password", () => {
    test("should show success message after submitting forgot password form", async ({
      page,
    }) => {
      await page.goto("/forgot-password");

      // Use seeded test user email
      await page.getByLabel("Email").fill(TEST_USER.email);

      // Submit form
      await page.getByRole("button", { name: "Send reset link" }).click();

      // Verify success message appears
      await expect(page.getByText("Check your email")).toBeVisible({
        timeout: 10000,
      });
      // Check for the alert containing password reset info
      await expect(page.getByRole("alert")).toBeVisible();
    });
  });

  test.describe("Auth Page Navigation", () => {
    test("should navigate from sign in to register page", async ({ page }) => {
      await page.goto("/login");

      // Click sign up link
      await page.getByRole("link", { name: "Sign up" }).click();

      // Verify we're on register page
      await expect(page).toHaveURL("/register");
      await expect(
        page.getByRole("heading", { name: "Create your account" }),
      ).toBeVisible();
    });

    test("should navigate from register to sign in page", async ({ page }) => {
      await page.goto("/register");

      // Click sign in link
      await page.getByRole("link", { name: "Sign in" }).click();

      // Verify we're on sign in page
      await expect(page).toHaveURL("/login");
      await expect(
        page.getByRole("heading", { name: /Sign in/i }),
      ).toBeVisible();
    });

    test("should navigate from sign in to forgot password and back", async ({
      page,
    }) => {
      await page.goto("/login");

      // Click forgot password link
      await page.getByRole("link", { name: "Forgot password?" }).click();

      // Verify we're on forgot password page
      await expect(page).toHaveURL("/forgot-password");
      await expect(
        page.getByRole("heading", { name: "Reset your password" }),
      ).toBeVisible();

      // Click back button
      await page.getByRole("link", { name: "Back" }).click();

      // Verify we're back on sign in page
      await expect(page).toHaveURL("/login");
    });
  });
});
