/**
 * Query key factory for household-related queries
 * This ensures consistent and type-safe query keys across the app
 */
export const householdQueryKeys = {
  // Base key for all household queries
  all: ["household"] as const,

  // Current user's household
  current: () => [...householdQueryKeys.all, "current"] as const,

  // Members of a household
  members: (householdId: string) => [...householdQueryKeys.all, "members", householdId] as const,

  // Invite code information
  inviteInfo: (code: string) => [...householdQueryKeys.all, "invite", code] as const,

  // Shared stock items
  sharedStock: (householdId: string) => [...householdQueryKeys.all, "stock", householdId] as const,
} as const;
