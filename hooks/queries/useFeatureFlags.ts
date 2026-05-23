import { useQuery } from "@tanstack/react-query";
import { reviewApi } from "~/data/supabase-api/ReviewApi";

export function useFeatureFlag(key: string): { enabled: boolean; isLoading: boolean } {
  const { data, isLoading } = useQuery({
    queryKey: ["featureFlag", key],
    queryFn: () => reviewApi.fetchFeatureFlag(key),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return { enabled: data?.enabled ?? false, isLoading };
}
