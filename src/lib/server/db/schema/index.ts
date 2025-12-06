// Re-export all tables
export * from "./auth";
export * from "./workspace";
export * from "./file";
export * from "./user-preferences";
export * from "./membership";
export * from "./invite";
export * from "./activity";
export * from "./user-usage";

// Import tables for relations
import { user, account, session } from "./auth";
import { workspace } from "./workspace";
import { file } from "./file";
import { userPreferences } from "./user-preferences";
import { workspaceMember } from "./membership";
import { workspaceInvite } from "./invite";
import { relations } from "drizzle-orm";

// Define relations (must be after imports to avoid circular dependencies)
export const userRelations = relations(user, ({ many, one }) => ({
  accounts: many(account),
  sessions: many(session),
  workspaces: many(workspace),
  preferences: one(userPreferences),
  workspaceMemberships: many(workspaceMember),
  sentInvites: many(workspaceInvite),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const workspaceRelations = relations(workspace, ({ one, many }) => ({
  owner: one(user, {
    fields: [workspace.ownerId],
    references: [user.id],
  }),
  files: many(file),
  members: many(workspaceMember),
  invites: many(workspaceInvite),
}));

export const fileRelations = relations(file, ({ one }) => ({
  workspace: one(workspace, {
    fields: [file.workspaceId],
    references: [workspace.id],
  }),
}));

export const userPreferencesRelations = relations(
  userPreferences,
  ({ one }) => ({
    user: one(user, {
      fields: [userPreferences.userId],
      references: [user.id],
    }),
    lastWorkspace: one(workspace, {
      fields: [userPreferences.lastWorkspaceId],
      references: [workspace.id],
    }),
  }),
);

export const workspaceMemberRelations = relations(
  workspaceMember,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceMember.workspaceId],
      references: [workspace.id],
    }),
    user: one(user, {
      fields: [workspaceMember.userId],
      references: [user.id],
    }),
  }),
);

export const workspaceInviteRelations = relations(
  workspaceInvite,
  ({ one }) => ({
    workspace: one(workspace, {
      fields: [workspaceInvite.workspaceId],
      references: [workspace.id],
    }),
    invitedByUser: one(user, {
      fields: [workspaceInvite.invitedBy],
      references: [user.id],
    }),
  }),
);
