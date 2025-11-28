import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { eq, and, desc } from "drizzle-orm";
import {
  createInvite,
  acceptInvite,
  cancelInvite,
  expireInvites,
  type CreatedInvite,
} from "./invite";
import { db } from "$lib/server/db";
import {
  workspaceInvite,
  workspaceMember,
  workspaceActivity,
} from "./schema";
import {
  createTestUser,
  createTestWorkspace,
  createTestMember,
  createTestInvite,
  cleanupTestData,
} from "../../../../tests/helpers/test-db";

describe("invite database functions", () => {
  let owner: Awaited<ReturnType<typeof createTestUser>>;
  let workspace: Awaited<ReturnType<typeof createTestWorkspace>>;
  let trackedUserIds: string[] = [];

  beforeEach(async () => {
    owner = await createTestUser({ name: "Workspace Owner" });
    workspace = await createTestWorkspace({
      name: "Workspace for invites",
      ownerId: owner.id,
    });
    trackedUserIds = [owner.id];
  });

  afterEach(async () => {
    await cleanupTestData(trackedUserIds);
  });

  const trackUser = (user: Awaited<ReturnType<typeof createTestUser>>) => {
    trackedUserIds.push(user.id);
    return user;
  };

  async function getActivityEvents(
    eventType:
      | "invite.sent"
      | "invite.accepted"
      | "invite.cancelled"
      | "member.added",
  ) {
    return await db
      .select({
        id: workspaceActivity.id,
        entityId: workspaceActivity.entityId,
        metadata: workspaceActivity.metadata,
      })
      .from(workspaceActivity)
      .where(
        and(
          eq(workspaceActivity.workspaceId, workspace.id),
          eq(workspaceActivity.eventType, eventType),
        ),
      )
      .orderBy(desc(workspaceActivity.createdAt));
  }

  describe("createInvite", () => {
    it("returns unhashed token, stores hashed value, and logs invite.sent", async () => {
      const invite = (await createInvite(
        workspace.id,
        "new-member@example.com",
        owner.id,
      )) as CreatedInvite;

      expect(invite.token).toBeDefined();

      const storedInvite = await db
        .select()
        .from(workspaceInvite)
        .where(eq(workspaceInvite.id, invite.id))
        .limit(1)
        .then((rows) => rows[0]);

      expect(storedInvite).toBeDefined();
      expect(storedInvite?.token).not.toBe(invite.token);

      const events = await getActivityEvents("invite.sent");
      expect(events.find((event) => event.entityId === invite.id)).toBeDefined();
    });

    it("prevents duplicate pending invites for the same email", async () => {
      await createInvite(workspace.id, "dup@example.com", owner.id);

      await expect(
        createInvite(workspace.id, "dup@example.com", owner.id),
      ).rejects.toThrow("A pending invite already exists for this email");
    });

    it("allows only workspace owners to create invites", async () => {
      const nonOwner = trackUser(
        await createTestUser({ name: "Non Owner User" }),
      );

      await expect(
        createInvite(workspace.id, "friend@example.com", nonOwner.id),
      ).rejects.toThrow("Only workspace owners can invite members");
    });
  });

  describe("acceptInvite", () => {
    it("rejects acceptance when emails do not match", async () => {
      const invitee = trackUser(
        await createTestUser({ email: "invitee@example.com" }),
      );
      const otherUser = trackUser(
        await createTestUser({ email: "other@example.com" }),
      );

      const invite = (await createInvite(
        workspace.id,
        invitee.email,
        owner.id,
      )) as CreatedInvite;

      await expect(
        acceptInvite(invite.token, otherUser.id, otherUser.email),
      ).rejects.toThrow("This invitation was sent to a different email address");
    });

    it("creates membership, logs invite.accepted and member.added", async () => {
      const invitee = trackUser(
        await createTestUser({ email: "fresh@example.com" }),
      );

      const invite = (await createInvite(
        workspace.id,
        invitee.email,
        owner.id,
      )) as CreatedInvite;

      const result = await acceptInvite(
        invite.token,
        invitee.id,
        invitee.email,
      );

      expect(result.membership.workspaceId).toBe(workspace.id);
      expect(result.membership.userId).toBe(invitee.id);

      const memberRecord = await db
        .select()
        .from(workspaceMember)
        .where(
          and(
            eq(workspaceMember.workspaceId, workspace.id),
            eq(workspaceMember.userId, invitee.id),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);

      expect(memberRecord).toBeDefined();

      const accepted = await getActivityEvents("invite.accepted");
      expect(
        accepted.find((event) => event.entityId === invite.id),
      ).toBeDefined();

      const memberAdded = await getActivityEvents("member.added");
      expect(
        memberAdded.find((event) => event.entityId === memberRecord?.id),
      ).toBeDefined();
    });

    it("logs only invite.accepted when user is already a member", async () => {
      const invitee = trackUser(
        await createTestUser({ email: "existing@example.com" }),
      );

      await createTestMember({
        workspaceId: workspace.id,
        userId: invitee.id,
      });

      const invite = (await createInvite(
        workspace.id,
        invitee.email,
        owner.id,
      )) as CreatedInvite;

      await acceptInvite(invite.token, invitee.id, invitee.email);

      const acceptedEvents = await getActivityEvents("invite.accepted");
      expect(
        acceptedEvents.find((event) => event.entityId === invite.id),
      ).toBeDefined();

      const memberAddedEvents = await getActivityEvents("member.added");
      expect(memberAddedEvents).toHaveLength(0);
    });
  });

  describe("cancelInvite", () => {
    it("requires workspace ownership", async () => {
      const invite = (await createInvite(
        workspace.id,
        "cancel-me@example.com",
        owner.id,
      )) as CreatedInvite;

      const nonOwner = trackUser(
        await createTestUser({ name: "Non Owner" }),
      );

      await expect(
        cancelInvite(invite.id, nonOwner.id),
      ).rejects.toThrow("Only workspace owners can cancel invites");
    });

    it("marks invite as cancelled and logs activity", async () => {
      const invite = (await createInvite(
        workspace.id,
        "cancel-success@example.com",
        owner.id,
      )) as CreatedInvite;

      await cancelInvite(invite.id, owner.id);

      const updatedInvite = await db
        .select()
        .from(workspaceInvite)
        .where(eq(workspaceInvite.id, invite.id))
        .limit(1)
        .then((rows) => rows[0]);

      expect(updatedInvite?.status).toBe("cancelled");

      const cancelledEvents = await getActivityEvents("invite.cancelled");
      expect(
        cancelledEvents.find((event) => event.entityId === invite.id),
      ).toBeDefined();
    });
  });

  describe("expireInvites", () => {
    it("expires pending invites that are past their expiration date", async () => {
      const pastInvite = await createTestInvite({
        workspaceId: workspace.id,
        email: "past@example.com",
        invitedBy: owner.id,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });

      const futureInvite = await createTestInvite({
        workspaceId: workspace.id,
        email: "future@example.com",
        invitedBy: owner.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await expireInvites();

      const [pastStatus, futureStatus] = await Promise.all([
        db
          .select({ status: workspaceInvite.status })
          .from(workspaceInvite)
          .where(eq(workspaceInvite.id, pastInvite.id))
          .then((rows) => rows[0]?.status),
        db
          .select({ status: workspaceInvite.status })
          .from(workspaceInvite)
          .where(eq(workspaceInvite.id, futureInvite.id))
          .then((rows) => rows[0]?.status),
      ]);

      expect(pastStatus).toBe("expired");
      expect(futureStatus).toBe("pending");
    });
  });
});

