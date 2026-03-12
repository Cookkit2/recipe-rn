import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { challengeQueryKeys } from "./challengeQueryKeys";
import type { ChallengeProgress, ChallengeType } from "~/types/achievements";
import { challengeService } from "~/data/services/ChallengeService";
import { log } from "~/utils/logger";

/**
 * Hook to fetch all active challenges
 */
export function useActiveChallenges() {
  return useQuery({
    queryKey: challengeQueryKeys.active(),
    queryFn: () => challengeService.getActiveChallenges(),
    staleTime: 2 * 60 * 1000, // 2 minutes - challenge progress changes frequently
    gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
  });
}

/**
 * Hook to fetch active daily challenges
 */
export function useDailyChallenges() {
  return useQuery({
    queryKey: challengeQueryKeys.daily(),
    queryFn: () => challengeService.getActiveDailyChallenges(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch active weekly challenges
 */
export function useWeeklyChallenges() {
  return useQuery({
    queryKey: challengeQueryKeys.weekly(),
    queryFn: () => challengeService.getActiveWeeklyChallenges(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch user's active (in progress) challenges
 */
export function useUserActiveChallenges() {
  return useQuery({
    queryKey: challengeQueryKeys.userActive(),
    queryFn: () => challengeService.getUserActiveChallenges(),
    staleTime: 1 * 60 * 1000, // 1 minute - active challenges need more frequent updates
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch user's completed challenges
 */
export function useCompletedChallenges() {
  return useQuery({
    queryKey: challengeQueryKeys.completed(),
    queryFn: () => challengeService.getUserCompletedChallenges(),
    staleTime: 5 * 60 * 1000, // 5 minutes - completed challenges don't change
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch unclaimed completed challenges
 */
export function useUnclaimedChallenges() {
  return useQuery({
    queryKey: challengeQueryKeys.unclaimed(),
    queryFn: () => challengeService.getUnclaimedChallenges(),
    staleTime: 30 * 1000, // 30 seconds - important to check frequently for rewards
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch progress for a specific challenge
 */
export function useChallengeProgress(challengeId: string) {
  return useQuery({
    queryKey: challengeQueryKeys.progress(challengeId),
    queryFn: () => challengeService.getProgress(challengeId),
    enabled: !!challengeId,
    staleTime: 30 * 1000, // 30 seconds - individual challenge progress updates often
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch challenges expiring soon (within 24 hours)
 */
export function useChallengesExpiringSoon() {
  return useQuery({
    queryKey: challengeQueryKeys.expiringSoon(),
    queryFn: () => challengeService.getChallengesExpiringSoon(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch total XP earned from challenges
 */
export function useTotalXPEarned() {
  return useQuery({
    queryKey: challengeQueryKeys.totalXP(),
    queryFn: () => challengeService.getTotalXPEarned(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch available XP from active challenges
 */
export function useAvailableXP() {
  return useQuery({
    queryKey: challengeQueryKeys.availableXP(),
    queryFn: () => challengeService.getAvailableXP(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Mutation hook to start a challenge
 */
export function useStartChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeId: string) => challengeService.startChallenge(challengeId),
    onSuccess: (_, challengeId) => {
      // Invalidate the specific challenge query
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.progress(challengeId),
      });

      // Invalidate user active challenges
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.userActive(),
      });

      // Invalidate active challenges
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.active(),
      });
    },
  });
}

/**
 * Mutation hook to update challenge progress
 */
export function useUpdateChallengeProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeId, progress }: { challengeId: string; progress: number }) =>
      challengeService.updateProgress(challengeId, progress),
    onSuccess: (_, variables) => {
      // Invalidate the specific challenge query
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.progress(variables.challengeId),
      });

      // Invalidate user active challenges
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.userActive(),
      });

      // Invalidate unclaimed challenges (might be newly completed)
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.unclaimed(),
      });
    },
  });
}

/**
 * Mutation hook to increment challenge progress by a specific amount
 */
export function useIncrementChallengeProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ challengeId, amount }: { challengeId: string; amount: number }) =>
      challengeService.incrementProgress(challengeId, amount),
    onSuccess: (_, variables) => {
      // Invalidate the specific challenge query
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.progress(variables.challengeId),
      });

      // Invalidate user active challenges
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.userActive(),
      });

      // Invalidate unclaimed challenges (might be newly completed)
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.unclaimed(),
      });
    },
  });
}

/**
 * Mutation hook to complete a challenge
 */
export function useCompleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeId: string) => challengeService.completeChallenge(challengeId),
    onSuccess: (_, challengeId) => {
      // Invalidate the specific challenge query
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.progress(challengeId),
      });

      // Invalidate user active and completed challenges
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.userActive(),
      });
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.completed(),
      });

      // Invalidate unclaimed challenges (ready for reward claiming)
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.unclaimed(),
      });
    },
  });
}

/**
 * Mutation hook to claim rewards for a completed challenge
 */
export function useClaimChallengeRewards() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (challengeId: string) => challengeService.claimRewards(challengeId),
    onSuccess: (result, challengeId) => {
      // Log the XP gained
      if (result.success) {
        log.info(`💰 Claimed ${result.xp} XP from challenge`);
      }

      // Invalidate the specific challenge query
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.progress(challengeId),
      });

      // Invalidate completed challenges
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.completed(),
      });

      // Invalidate unclaimed challenges
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.unclaimed(),
      });

      // Invalidate total XP
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.totalXP(),
      });
    },
  });
}

/**
 * Mutation hook to check all challenges based on user activity
 * This should be called when user completes relevant actions (cooking, etc.)
 */
export function useCheckChallenges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ metric, amount }: { metric: string; amount?: number }) =>
      challengeService.checkChallenges(metric, amount),
    onSuccess: (result) => {
      // Log progress updates and newly completed challenges
      if (result.progressUpdated.length > 0) {
        log.info(`📈 Updated progress for ${result.progressUpdated.length} challenge(s)`);
      }

      if (result.newlyCompleted.length > 0) {
        log.info(`✅ Completed ${result.newlyCompleted.length} challenge(s)`);
      }

      // Invalidate all challenge queries to refetch updated progress
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.all,
      });
    },
  });
}

/**
 * Mutation hook to expire old challenges
 * Should be called periodically (e.g., daily)
 */
export function useExpireOldChallenges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => challengeService.expireOldChallenges(),
    onSuccess: (expiredCount) => {
      if (expiredCount > 0) {
        log.info(`⏰ Expired ${expiredCount} challenge(s)`);
      }

      // Invalidate all challenge queries
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.all,
      });
    },
  });
}

/**
 * Hook to manually refresh challenge data
 */
export function useRefreshChallenges() {
  const queryClient = useQueryClient();

  const refresh = () => {
    return queryClient.invalidateQueries({
      queryKey: challengeQueryKeys.all,
    });
  };

  return { refresh };
}

/**
 * Combined hook for streak-related challenge operations
 * Provides easy access to current and longest streak
 */
export function useStreakChallenges() {
  const queryClient = useQueryClient();

  const checkStreakProgress = () => {
    // This checks all challenges related to streaks
    return challengeService.checkChallenges("consecutive_days", 1);
  };

  const mutation = useMutation({
    mutationFn: checkStreakProgress,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: challengeQueryKeys.all,
      });
      // Also invalidate achievements since streak affects them
      queryClient.invalidateQueries({
        queryKey: ["achievements"],
      });
    },
  });

  return {
    checkStreak: mutation.mutate,
    isChecking: mutation.isPending,
  };
}
