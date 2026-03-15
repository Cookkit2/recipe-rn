import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeQueryKeys } from "./queries/recipeQueryKeys";
import { recipeVersionRepository } from "~/data/db/repositories";
import type RecipeVersionModel from "~/data/db/models/RecipeVersion";
import type { RecipeVersionData } from "~/data/db/models/RecipeVersion";
import { log } from "~/utils/logger";

/**
 * Recipe version metadata for display in UI
 */
export interface RecipeVersionMetadata {
  id: string;
  versionNumber: number;
  title: string;
  description: string;
  prepMinutes: number;
  cookMinutes: number;
  difficultyStars: number;
  servings: number;
  createdAt: Date;
  updatedAt: Date;
  totalMinutes: number;
}

/**
 * Hook to get all versions for a specific recipe
 */
export function useRecipeVersions(recipeId: string) {
  return useQuery({
    queryKey: recipeQueryKeys.versions(recipeId),
    queryFn: async () => {
      if (!recipeVersionRepository) {
        throw new Error("RecipeVersionRepository not initialized");
      }
      const versions = await recipeVersionRepository.getVersionsForRecipe(recipeId, {
        sortBy: "version_number",
        sortOrder: "desc", // Newest first
      });
      return versions.map(toVersionMetadata);
    },
    enabled: !!recipeId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get the latest version for a specific recipe
 */
export function useLatestRecipeVersion(recipeId: string) {
  return useQuery({
    queryKey: recipeQueryKeys.latestVersion(recipeId),
    queryFn: async () => {
      if (!recipeVersionRepository) {
        throw new Error("RecipeVersionRepository not initialized");
      }
      const version = await recipeVersionRepository.getLatestVersion(recipeId);
      return version ? toVersionMetadata(version) : null;
    },
    enabled: !!recipeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Options for useRecipeVersioning hook
 */
export interface UseRecipeVersioningOptions {
  /** Recipe ID to manage versions for */
  recipeId: string;
}

/**
 * Hook for recipe version management
 *
 * Provides methods for:
 * - Creating new versions
 * - Reverting to previous versions
 * - Deleting old versions
 *
 * @example
 * const { createVersion, revertToVersion, deleteOldVersions, versions } = useRecipeVersioning({ recipeId: '123' });
 */
export function useRecipeVersioning(options: UseRecipeVersioningOptions) {
  const { recipeId } = options;
  const queryClient = useQueryClient();

  // Query to get all versions
  const versionsQuery = useRecipeVersions(recipeId);

  /**
   * Mutation to create a new version from current recipe state
   */
  const createVersion = useMutation({
    mutationFn: async (versionData: Omit<RecipeVersionData, "versionNumber">) => {
      if (!recipeVersionRepository) {
        throw new Error("RecipeVersionRepository not initialized");
      }

      // Get the next version number
      const nextVersionNumber = await recipeVersionRepository.getNextVersionNumber(recipeId);

      // Create the version
      const newVersion = await recipeVersionRepository.createVersion({
        ...versionData,
        versionNumber: nextVersionNumber,
      });

      return toVersionMetadata(newVersion);
    },
    onSuccess: () => {
      // Invalidate versions list
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.versions(recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.latestVersion(recipeId),
      });
    },
    onError: (error) => {
      log.error("Failed to create recipe version:", error);
    },
  });

  /**
   * Query to get a specific version by version number
   * This is used for reverting - the caller handles the actual recipe update
   */
  const getVersion = useMutation({
    mutationFn: async (versionNumber: number) => {
      if (!recipeVersionRepository) {
        throw new Error("RecipeVersionRepository not initialized");
      }

      const version = await recipeVersionRepository.getVersionByNumber(recipeId, versionNumber);

      if (!version) {
        throw new Error(`Version ${versionNumber} not found`);
      }

      return toVersionMetadata(version);
    },
    onSuccess: () => {
      // Invalidate version queries
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.versions(recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.latestVersion(recipeId),
      });
    },
    onError: (error) => {
      log.error("Failed to get recipe version:", error);
    },
  });

  /**
   * Mutation to delete old versions, keeping only the specified count
   */
  const deleteOldVersions = useMutation({
    mutationFn: async (keepCount: number = 10) => {
      if (!recipeVersionRepository) {
        throw new Error("RecipeVersionRepository not initialized");
      }

      // Get all versions for the recipe
      const allVersions = await recipeVersionRepository.getVersionsForRecipe(recipeId, {
        sortBy: "version_number",
        sortOrder: "desc",
      });

      // Keep the most recent versions
      if (allVersions.length <= keepCount) {
        return { deletedCount: 0, keptCount: allVersions.length };
      }

      // Delete versions beyond the keep count
      const versionsToDelete = allVersions.slice(keepCount);
      let deletedCount = 0;

      for (const version of versionsToDelete) {
        try {
          await recipeVersionRepository.deleteVersion(version.id);
          deletedCount++;
        } catch (error) {
          log.warn(`Failed to delete version ${version.versionNumber}:`, error);
        }
      }

      return {
        deletedCount,
        keptCount: keepCount,
      };
    },
    onSuccess: (result) => {
      // Invalidate versions list
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.versions(recipeId),
      });
      queryClient.invalidateQueries({
        queryKey: recipeQueryKeys.latestVersion(recipeId),
      });

      log.info(
        `Deleted ${result.deletedCount} old versions for recipe ${recipeId}, kept ${result.keptCount}`
      );
    },
    onError: (error) => {
      log.error("Failed to delete old versions:", error);
    },
  });

  return {
    // Version list with metadata
    versions: versionsQuery.data ?? [],
    isLoadingVersions: versionsQuery.isLoading,
    versionsError: versionsQuery.error,

    // Mutations
    createVersion: createVersion.mutateAsync,
    isCreatingVersion: createVersion.isPending,

    getVersion: getVersion.mutateAsync,
    isLoadingVersion: getVersion.isPending,

    deleteOldVersions: deleteOldVersions.mutateAsync,
    isDeletingOldVersions: deleteOldVersions.isPending,

    // Refetch versions
    refetchVersions: versionsQuery.refetch,
  };
}

/**
 * Convert RecipeVersion model to metadata format
 */
function toVersionMetadata(version: RecipeVersionModel): RecipeVersionMetadata {
  return {
    id: version.id,
    versionNumber: version.versionNumber,
    title: version.title,
    description: version.description,
    prepMinutes: version.prepMinutes,
    cookMinutes: version.cookMinutes,
    difficultyStars: version.difficultyStars,
    servings: version.servings,
    createdAt: version.createdAt,
    updatedAt: version.updatedAt,
    totalMinutes: version.totalMinutes,
  };
}
