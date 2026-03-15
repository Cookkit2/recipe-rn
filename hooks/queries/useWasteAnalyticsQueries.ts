import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { databaseFacade } from "~/data/db";
import type { RecordWasteData } from "~/data/db/DatabaseFacade";
import type { WasteStats, WasteOverTimeData } from "~/data/db/repositories/WasteLogRepository";
import { wasteAnalyticsQueryKeys } from "./wasteAnalyticsQueryKeys";

/**
 * Hook to fetch waste statistics for a given period
 */
export function useWasteStats(startDate?: number, endDate?: number) {
  return useQuery({
    queryKey: [wasteAnalyticsQueryKeys.dashboard(), startDate, endDate],
    queryFn: () => databaseFacade.getWasteStats(startDate, endDate),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch waste logs with optional filters
 */
export function useWasteHistory(limit?: number) {
  return useQuery({
    queryKey: wasteAnalyticsQueryKeys.discardedItems(),
    queryFn: () => databaseFacade.getWasteLogs({ limit }),
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch waste logs for a specific date range
 */
export function useWasteHistoryByDateRange(startDate: number, endDate: number) {
  return useQuery({
    queryKey: wasteAnalyticsQueryKeys.discardedItemsByDateRange(
      new Date(startDate).toISOString(),
      new Date(endDate).toISOString()
    ),
    queryFn: () => databaseFacade.getWasteForDateRange(startDate, endDate),
    enabled: !!startDate && !!endDate,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to fetch waste trends over time
 */
export function useWasteOverTime(
  startDate?: number,
  endDate?: number,
  groupBy: "day" | "week" | "month" = "week"
) {
  return useQuery({
    queryKey: [...wasteAnalyticsQueryKeys.trends(groupBy), startDate, endDate],
    queryFn: () => databaseFacade.getWasteOverTime(startDate, endDate, groupBy),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch most wasted items
 */
export function useMostWastedItems(limit: number = 10, startDate?: number, endDate?: number) {
  return useQuery({
    queryKey: [
      ...wasteAnalyticsQueryKeys.discardedItems(),
      "mostWasted",
      limit,
      startDate,
      endDate,
    ],
    queryFn: () => databaseFacade.getMostWastedItems(limit, startDate, endDate),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch total waste cost for a period
 */
export function useTotalWasteCost(startDate?: number, endDate?: number) {
  return useQuery({
    queryKey: [...wasteAnalyticsQueryKeys.moneySaved(), "total", startDate, endDate],
    queryFn: () => databaseFacade.getTotalWasteCost(startDate, endDate),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch waste logs filtered by reason
 */
export function useWasteByReason(reason: string) {
  return useQuery({
    queryKey: [...wasteAnalyticsQueryKeys.discardedItems(), "reason", reason],
    queryFn: () => databaseFacade.getWasteByReason(reason),
    enabled: !!reason,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get waste count for a specific stock item
 */
export function useStockWasteCount(stockId: string) {
  return useQuery({
    queryKey: [...wasteAnalyticsQueryKeys.discardedItems(), "count", stockId],
    queryFn: () => databaseFacade.getStockWasteCount(stockId),
    enabled: !!stockId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Hook to get total waste quantity for a specific stock item
 */
export function useStockWasteQuantity(stockId: string) {
  return useQuery({
    queryKey: [...wasteAnalyticsQueryKeys.discardedItems(), "quantity", stockId],
    queryFn: () => databaseFacade.getStockTotalWasteQuantity(stockId),
    enabled: !!stockId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

/**
 * Mutation hook to record a new waste entry
 */
export function useRecordWaste() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      stockId,
      quantityWasted,
      data,
    }: {
      stockId: string;
      quantityWasted: number;
      data?: RecordWasteData;
    }) => databaseFacade.recordWaste(stockId, quantityWasted, data),
    onSuccess: () => {
      // Invalidate all waste analytics queries
      queryClient.invalidateQueries({
        queryKey: wasteAnalyticsQueryKeys.all,
      });
    },
  });
}

/**
 * Mutation hook to delete waste logs by stock ID
 */
export function useDeleteWasteLogs() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (stockId: string) => databaseFacade.deleteWasteLogsByStockId(stockId),
    onSuccess: () => {
      // Invalidate all waste analytics queries
      queryClient.invalidateQueries({
        queryKey: wasteAnalyticsQueryKeys.all,
      });
    },
  });
}

/**
 * Hook to manually refresh waste analytics data
 */
export function useRefreshWasteAnalytics() {
  const queryClient = useQueryClient();

  const refresh = () => {
    return queryClient.invalidateQueries({
      queryKey: wasteAnalyticsQueryKeys.all,
    });
  };

  return { refresh };
}
