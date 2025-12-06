import type { UserPlan } from "./db/schema/auth";

export const PLAN_LIMITS = {
  free: {
    storageBytes: 50 * 1024 * 1024, // 50 MB
    maxWorkspaces: 3,
    maxFileSizeBytes: 10 * 1024 * 1024, // 10 MB
    allowsInvites: false,
  },
  pro: {
    storageBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    maxWorkspaces: Infinity,
    maxFileSizeBytes: 100 * 1024 * 1024, // 100 MB
    allowsInvites: true,
  },
} as const satisfies Record<UserPlan, {
  storageBytes: number;
  maxWorkspaces: number;
  maxFileSizeBytes: number;
  allowsInvites: boolean;
}>;

export class UsageLimitExceededError extends Error {
  constructor(
    message: string,
    public readonly limitType: "storage" | "file_size" | "workspace" | "invite",
    public readonly currentUsage?: number,
    public readonly limit?: number,
  ) {
    super(message);
    this.name = "UsageLimitExceededError";
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

