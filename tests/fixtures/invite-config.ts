export const INVITE_CONFIG = {
  pending: { email: "invited@example.com", role: "member" as const },
  accepted: { email: "accepted-member@example.com", role: "member" as const },
  cancelled: { email: "cancelled@example.com", role: "member" as const },
} as const;
