import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { householdQueryKeys } from "./householdQueryKeys";
import { householdApiFunctions } from "~/data/api/householdApi";
import { useHouseholdStore } from "~/store/HouseholdStore";
import { toast } from "sonner-native";

/**
 * Hook to fetch current user's household
 *
 * @returns React Query result with household data
 *
 * @remarks
 * - Updates HouseholdStore with fetched household
 * - staleTime: 30 seconds for balance between freshness and performance
 */
export function useCurrentHousehold() {
  const setHousehold = useHouseholdStore((s) => s.setCurrentHousehold);

  return useQuery({
    queryKey: householdQueryKeys.current(),
    queryFn: async () => {
      const household = await householdApiFunctions.fetchCurrentHousehold();
      setHousehold(household);
      return household;
    },
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch members of a household
 *
 * @param householdId - The household ID to fetch members for
 * @returns React Query result with members data
 *
 * @remarks
 * - Query is disabled until a householdId is provided
 * - staleTime: 30 seconds for member data
 */
export function useHouseholdMembers(householdId: string | undefined) {
  return useQuery({
    queryKey: householdQueryKeys.members(householdId ?? ""),
    queryFn: () => householdApiFunctions.fetchMembers(householdId!),
    enabled: !!householdId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to fetch invite information by code
 *
 * @param code - The invite code to look up
 * @returns React Query result with invite info (household + member count)
 *
 * @remarks
 * - Query is disabled until a code is provided
 * - staleTime: 10 seconds for invite validation
 */
export function useInviteInfo(code: string) {
  return useQuery({
    queryKey: householdQueryKeys.inviteInfo(code),
    queryFn: () => householdApiFunctions.fetchInviteInfo(code),
    enabled: code.length > 0,
    staleTime: 10 * 1000,
  });
}

/**
 * Mutation hook to create a new household
 *
 * @returns React Query mutation for creating a household
 *
 * @remarks
 * - Invalidates all household queries on success
 * - Shows toast on error
 */
export function useCreateHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => householdApiFunctions.createHousehold(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation hook to join an existing household
 *
 * @returns React Query mutation for joining a household
 *
 * @remarks
 * - Invalidates all household queries on success
 * - Shows toast on error
 */
export function useJoinHousehold() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (inviteCode: string) => householdApiFunctions.joinHousehold(inviteCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation hook to leave current household
 *
 * @returns React Query mutation for leaving a household
 *
 * @remarks
 * - Resets HouseholdStore on success
 * - Invalidates all household queries on success
 * - Shows toast on error
 */
export function useLeaveHousehold() {
  const queryClient = useQueryClient();
  const reset = useHouseholdStore((s) => s.reset);

  return useMutation({
    mutationFn: (householdId: string) => householdApiFunctions.leaveHousehold(householdId),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation hook to dissolve (delete) current household
 *
 * @returns React Query mutation for dissolving a household
 *
 * @remarks
 * - Resets HouseholdStore on success
 * - Invalidates all household queries on success
 * - Shows toast on error
 */
export function useDissolveHousehold() {
  const queryClient = useQueryClient();
  const reset = useHouseholdStore((s) => s.reset);

  return useMutation({
    mutationFn: ({
      householdId,
      householdSupabaseId,
    }: {
      householdId: string;
      householdSupabaseId: string;
    }) => householdApiFunctions.dissolveHousehold(householdId, householdSupabaseId),
    onSuccess: () => {
      reset();
      queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation hook to regenerate invite code
 *
 * @returns React Query mutation for regenerating invite code
 *
 * @remarks
 * - Invalidates all household queries on success
 * - Shows success toast with new code
 * - Shows error toast on failure
 */
export function useRegenerateInviteCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      householdId,
      householdSupabaseId,
    }: {
      householdId: string;
      householdSupabaseId: string;
    }) => householdApiFunctions.regenerateInviteCode(householdId, householdSupabaseId),
    onSuccess: (newCode) => {
      queryClient.invalidateQueries({ queryKey: householdQueryKeys.all });
      toast.success(`New invite code: ${newCode}`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Mutation hook to sync shared stock
 *
 * @returns React Query mutation for syncing shared stock
 *
 * @remarks
 * - No cache invalidation (sync is a background operation)
 * - No toast notifications
 */
export function useSyncSharedStock() {
  return useMutation({
    mutationFn: (householdSupabaseId: string) =>
      householdApiFunctions.syncSharedStock(householdSupabaseId),
  });
}
