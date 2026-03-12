import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { achievementQueryKeys } from "./achievementQueryKeys";
import type { AchievementCategory, AchievementProgress } from "~/types/achievements";
import { achievementService } from "~/data/services/AchievementService";
import { log } from "~/utils/logger";

/**
 * Hook to fetch all achievement progress
 */
export function useAchievements() {
  return useQuery({
    queryKey: achievementQueryKeys.allProgress(),
    queryFn: () => achievementService.getAllProgress(),
    staleTime: 5 * 60 * 1000, // 5 minutes - achievements don't change that frequently
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
  });
}

/**
 * Hook to fetch achievement progress by category
 */
export function useAchievementsByCategory(category: AchievementCategory) {
  return useQuery({
    queryKey: achievementQueryKeys.byCategory(category),
    queryFn: () => achievementService.getProgressByCategory(category),
    enabled: !!category,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch progress for a specific achievement
 */
export function useAchievementProgress(achievementId: string) {
  return useQuery({
    queryKey: achievementQueryKeys.progress(achievementId),
    queryFn: () => achievementService.getProgress(achievementId),
    enabled: !!achievementId,
    staleTime: 2 * 60 * 1000, // 2 minutes - individual progress might change more often
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check all achievements (triggers progress checks)
 * This is useful to call after user actions that might unlock achievements
 */
export function useCheckAchievements() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => achievementService.checkAchievements(),
    onSuccess: (result) => {
      // Log newly unlocked achievements
      if (result.newlyUnlocked.length > 0) {
        log.info(`🏆 Unlocked ${result.newlyUnlocked.length} achievement(s)`);
      }

      // Invalidate all achievement queries to refetch updated progress
      queryClient.invalidateQueries({
        queryKey: achievementQueryKeys.all,
      });

      // Also invalidate challenge queries since achievements might affect them
      queryClient.invalidateQueries({
        queryKey: ["challenges"],
      });
    },
  });
}

/**
 * Hook to manually update achievement progress
 * Use this for special cases where progress needs manual updates
 */
export function useUpdateAchievementProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ achievementId, progress }: { achievementId: string; progress: number }) =>
      achievementService.updateProgress(achievementId, progress),
    onSuccess: (_, variables) => {
      // Invalidate the specific achievement query
      queryClient.invalidateQueries({
        queryKey: achievementQueryKeys.progress(variables.achievementId),
      });

      // Invalidate all achievement queries
      queryClient.invalidateQueries({
        queryKey: achievementQueryKeys.all,
      });
    },
  });
}

/**
 * Hook to increment achievement progress by a specific amount
 */
export function useIncrementAchievementProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ achievementId, amount }: { achievementId: string; amount: number }) =>
      achievementService.incrementProgress(achievementId, amount),
    onSuccess: (_, variables) => {
      // Invalidate the specific achievement query
      queryClient.invalidateQueries({
        queryKey: achievementQueryKeys.progress(variables.achievementId),
      });

      // Invalidate all achievement queries
      queryClient.invalidateQueries({
        queryKey: achievementQueryKeys.all,
      });
    },
  });
}

/**
 * Hook to unlock a specific achievement
 * Use this to manually unlock an achievement (bypassing normal checks)
 */
export function useUnlockAchievement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (achievementId: string) => achievementService.unlockAchievement(achievementId),
    onSuccess: (_, achievementId) => {
      // Invalidate the specific achievement query
      queryClient.invalidateQueries({
        queryKey: achievementQueryKeys.progress(achievementId),
      });

      // Invalidate all achievement queries
      queryClient.invalidateQueries({
        queryKey: achievementQueryKeys.all,
      });
    },
  });
}

/**
 * Hook to manually refresh achievement data
 */
export function useRefreshAchievements() {
  const queryClient = useQueryClient();

  const refresh = () => {
    return queryClient.invalidateQueries({
      queryKey: achievementQueryKeys.all,
    });
  };

  return { refresh };
}
