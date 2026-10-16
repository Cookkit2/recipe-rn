import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leftoverApi } from "~/data/api/leftoverApi";
import type { LeftoverInput, LeftoverStatus } from "~/types/Leftover";
export const leftoverQueryKeys = { all: ["leftovers"] as const };
export function useLeftovers() {
  return useQuery({ queryKey: leftoverQueryKeys.all, queryFn: leftoverApi.listActive });
}
export function useLeftoverActions() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: leftoverQueryKeys.all });
  const save = useMutation({
    mutationFn: ({ input, id }: { input: LeftoverInput; id?: string }) =>
      leftoverApi.save(input, id),
    onSuccess: refresh,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeftoverStatus }) =>
      leftoverApi.setStatus(id, status),
    onSuccess: refresh,
  });
  return { save, setStatus };
}
