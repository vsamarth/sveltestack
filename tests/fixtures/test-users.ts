/**
 * Test user credentials for e2e testing.
 * These must match the users created in src/lib/server/db/seed.ts
 */
export const TEST_USERS = {
  /** Verified user - can login and access dashboard */
  verified: {
    id: "test-user-verified",
    email: "test@example.com",
    password: "password123",
    name: "Test User",
    emailVerified: true,
    workspaceName: "Test Workspace",
  },
  /** Unverified user - has account but email not verified */
  unverified: {
    id: "test-user-unverified",
    email: "unverified@example.com",
    password: "password123",
    name: "Unverified User",
    emailVerified: false,
    workspaceName: "Unverified Workspace",
  },
} as const;

export type TestUser = (typeof TEST_USERS)[keyof typeof TEST_USERS];
