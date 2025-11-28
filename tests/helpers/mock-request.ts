import type { User } from "better-auth/types";
import type { RequestEvent } from "@sveltejs/kit";
import { vi } from "vitest";

export function createMockRequestEvent(user: User | null): RequestEvent {
  return {
    locals: {
      user,
      session: user
        ? {
            id: "test-session-id",
            userId: user.id,
            expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
            token: "test-token",
            createdAt: new Date(),
            updatedAt: new Date(),
            ipAddress: null,
            userAgent: null,
          }
        : null,
    },
  } as unknown as RequestEvent;
}

export function mockGetRequestEventWithUser(user: User | null) {
  return createMockRequestEvent(user);
}

/**
 * Creates a mock implementation of getRequestEvent that returns a mock event with the given user.
 * This should be used with vi.mock at the top level of test files.
 *
 * @param user - The user to mock in the request event, or null for unauthenticated requests
 * @returns A mock function that returns the mock request event
 *
 * @example
 * ```ts
 * import { createGetRequestEventMock } from '../../../tests/helpers/mock-request';
 *
 * const mockGetRequestEvent = vi.fn();
 * vi.mock('$app/server', () => ({
 *   getRequestEvent: () => mockGetRequestEvent(),
 *   command: (schema, handler) => handler,
 * }));
 *
 * beforeEach(() => {
 *   mockGetRequestEvent.mockReturnValue(createMockRequestEvent(testUser));
 * });
 * ```
 */
export function createGetRequestEventMock(user: User | null) {
  return vi.fn(() => createMockRequestEvent(user));
}
