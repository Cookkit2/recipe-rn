import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mealPlanTemplateQueryKeys } from "./mealPlanTemplateQueryKeys";
import {
  mealPlanTemplateApi,
  type MealPlanTemplateData,
  type MealSlotTemplate,
} from "~/data/api/mealPlanTemplateApi";
import { mealPlanQueryKeys } from "./mealPlanQueryKeys";

/**
 * Hook to fetch all meal plan templates
 */
export function useMealPlanTemplates() {
  return useQuery({
    queryKey: mealPlanTemplateQueryKeys.templates(),
    queryFn: mealPlanTemplateApi.getAllTemplates,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single template by ID
 */
export function useMealPlanTemplate(templateId: string) {
  return useQuery({
    queryKey: mealPlanTemplateQueryKeys.byId(templateId),
    queryFn: () => mealPlanTemplateApi.getTemplateById(templateId),
    enabled: !!templateId,
    staleTime: 30 * 1000,
  });
}

/**
 * Hook to search templates by name or description
 */
export function useSearchTemplates(searchTerm: string) {
  return useQuery({
    queryKey: mealPlanTemplateQueryKeys.search(searchTerm),
    queryFn: () => mealPlanTemplateApi.searchTemplates(searchTerm),
    enabled: searchTerm.length > 0,
    staleTime: 30 * 1000,
  });
}

/**
 * Mutation hook to create a new meal plan template
 */
export function useCreateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      description,
      mealSlots,
    }: {
      name: string;
      description: string | undefined;
      mealSlots: MealSlotTemplate[];
    }) => mealPlanTemplateApi.createTemplate(name, description, mealSlots),
    onSuccess: () => {
      // Invalidate templates list to refetch
      queryClient.invalidateQueries({
        queryKey: mealPlanTemplateQueryKeys.templates(),
      });
    },
  });
}

/**
 * Mutation hook to update a meal plan template
 */
export function useUpdateTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      name,
      description,
      mealSlots,
    }: {
      templateId: string;
      name?: string;
      description?: string;
      mealSlots?: MealSlotTemplate[];
    }) => mealPlanTemplateApi.updateTemplate(templateId, name, description, mealSlots),
    onMutate: async ({ templateId }) => {
      // Cancel outgoing queries for this template
      await queryClient.cancelQueries({
        queryKey: mealPlanTemplateQueryKeys.byId(templateId),
      });

      // Snapshot previous value
      const previousValue = queryClient.getQueryData<MealPlanTemplateData>(
        mealPlanTemplateQueryKeys.byId(templateId)
      );

      return { previousValue, templateId };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(
          mealPlanTemplateQueryKeys.byId(context.templateId),
          context.previousValue
        );
      }
    },
    onSettled: (_, __, { templateId }) => {
      // Invalidate both the specific template and the list
      queryClient.invalidateQueries({
        queryKey: mealPlanTemplateQueryKeys.byId(templateId),
      });
      queryClient.invalidateQueries({
        queryKey: mealPlanTemplateQueryKeys.templates(),
      });
    },
  });
}

/**
 * Mutation hook to delete a meal plan template
 */
export function useDeleteTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (templateId: string) => mealPlanTemplateApi.deleteTemplate(templateId),
    onMutate: async (templateId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({
        queryKey: mealPlanTemplateQueryKeys.byId(templateId),
      });

      // Snapshot previous value
      const previousValue = queryClient.getQueryData<MealPlanTemplateData>(
        mealPlanTemplateQueryKeys.byId(templateId)
      );

      // Optimistically remove the template
      queryClient.setQueryData(mealPlanTemplateQueryKeys.byId(templateId), null);

      return { previousValue, templateId };
    },
    onError: (_, __, context) => {
      // Rollback on error
      if (context) {
        queryClient.setQueryData(
          mealPlanTemplateQueryKeys.byId(context.templateId),
          context.previousValue
        );
      }
    },
    onSettled: (_, __, templateId) => {
      // Invalidate both the specific template and the list
      queryClient.invalidateQueries({
        queryKey: mealPlanTemplateQueryKeys.byId(templateId),
      });
      queryClient.invalidateQueries({
        queryKey: mealPlanTemplateQueryKeys.templates(),
      });
    },
  });
}

/**
 * Mutation hook to apply a template to create meal plans
 */
export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      templateId,
      startDate,
      overwriteExisting,
    }: {
      templateId: string;
      startDate: Date;
      overwriteExisting?: boolean;
    }) =>
      mealPlanTemplateApi.applyTemplate({
        templateId,
        startDate,
        overwriteExisting,
      }),
    onSuccess: (_, variables) => {
      // Invalidate meal plan queries since applying a template creates meal plans
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.items(),
      });
      queryClient.invalidateQueries({
        queryKey: mealPlanQueryKeys.count(),
      });
      // Invalidate all dateRange queries
      queryClient.invalidateQueries({
        queryKey: [...mealPlanQueryKeys.all, "dateRange"],
      });
    },
  });
}

/**
 * Mutation hook to save current week's meal plans as a template
 */
export function useSaveWeekAsTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      startDate,
      name,
      description,
    }: {
      startDate: Date;
      name: string;
      description: string | undefined;
    }) => mealPlanTemplateApi.saveWeekAsTemplate(startDate, name, description),
    onSuccess: () => {
      // Invalidate templates list
      queryClient.invalidateQueries({
        queryKey: mealPlanTemplateQueryKeys.templates(),
      });
    },
  });
}

/**
 * Hook to manually refresh meal plan templates
 */
export function useRefreshMealPlanTemplates() {
  const queryClient = useQueryClient();

  const refresh = () => {
    return queryClient.invalidateQueries({
      queryKey: mealPlanTemplateQueryKeys.templates(),
    });
  };

  return { refresh };
}
