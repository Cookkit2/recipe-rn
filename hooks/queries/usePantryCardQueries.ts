import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { fetchPantryCards } from "~/data/api/pantryCardApi";
import type { ItemType } from "~/types/PantryItem";
import { pantryQueryKeys } from "./pantryQueryKeys";

export function usePantryCardsByType(type: ItemType) {
  const query = useQuery({
    queryKey: pantryQueryKeys.cards(),
    queryFn: fetchPantryCards,
    networkMode: "always",
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
  const data = useMemo(
    () => (type === "all" ? query.data : query.data?.filter((item) => item.type === type)),
    [query.data, type]
  );
  return { ...query, data };
}
