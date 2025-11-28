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
  /** Secondary collaborator with verified email */
  member: {
    id: "test-user-member",
    email: "member@example.com",
    password: "password123",
    name: "Member User",
    emailVerified: true,
    workspaceName: "Member Workspace",
  },
  /** User that will be targeted by invites */
  invited: {
    id: "test-user-invited",
    email: "invited@example.com",
    password: "password123",
    name: "Invited User",
    emailVerified: true,
    workspaceName: "Invited Workspace",
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
