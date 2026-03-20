import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GroceryItem } from "~/hooks/queries/useGroceryList";
import { useMalaysiaShopEligibility } from "~/hooks/useMalaysiaShopEligibility";
import { ShopRetailerApi, type ShopRetailerRow } from "~/data/supabase-api/ShopRetailerApi";
import { supabase } from "~/lib/supabase/supabase-client";
import {
  getPreferredMalaysiaRetailerSlug,
  setPreferredMalaysiaRetailerSlug,
  type MalaysiaRetailerSlug,
} from "~/lib/malaysia-shop-prefs";
import {
  computeEstimatedMyrTotal,
  estimateLineMyr,
  type PriceEstimateRow,
} from "~/utils/grocery-price-estimate";

function isRetailerSlug(s: string): s is MalaysiaRetailerSlug {
  return s === "speedmart_99" || s === "jaya_grocer";
}

export interface MalaysiaShopPricing {
  eligibility: ReturnType<typeof useMalaysiaShopEligibility>;
  retailers: ShopRetailerRow[];
  retailersLoading: boolean;
  selectedRetailer: ShopRetailerRow | null;
  pickRetailer: (r: ShopRetailerRow) => void;
  priceMap: Map<string, PriceEstimateRow>;
  pricesLoading: boolean;
  priceRollup: ReturnType<typeof computeEstimatedMyrTotal>;
  /** Per-line estimate for the selected retailer; null if unavailable */
  estimateLineMyr: (item: GroceryItem) => number | null;
  /** True when in Malaysia and a retailer is selected (show per-line hints) */
  showPerLineEstimates: boolean;
}

/**
 * Shared Malaysia shop + Supabase price estimates for grocery list and banner.
 */
export function useMalaysiaShopPricing(neededItems: GroceryItem[]): MalaysiaShopPricing {
  const eligibility = useMalaysiaShopEligibility();
  const [selectedRetailer, setSelectedRetailer] = useState<ShopRetailerRow | null>(null);

  const { data: retailersData, isLoading: retailersLoading } = useQuery({
    queryKey: ["malaysia", "shop", "retailers"],
    queryFn: () => new ShopRetailerApi(supabase).listMalaysiaRetailers(),
    enabled: eligibility.status === "eligible",
    staleTime: 1000 * 60 * 30,
  });
  const retailers = retailersData ?? [];

  const ingredientKeys = useMemo(
    () => neededItems.map((i) => i.normalizedName),
    [neededItems]
  );

  const { data: priceMap = new Map(), isLoading: pricesLoading } = useQuery({
    queryKey: ["malaysia", "shop", "prices", selectedRetailer?.id, ingredientKeys],
    queryFn: () =>
      new ShopRetailerApi(supabase).fetchPriceEstimates(selectedRetailer!.id, ingredientKeys),
    enabled:
      eligibility.status === "eligible" && !!selectedRetailer && ingredientKeys.length > 0,
  });

  useEffect(() => {
    if (retailers.length === 0) {
      setSelectedRetailer(null);
      return;
    }
    const pref = getPreferredMalaysiaRetailerSlug();
    const fromPref = pref ? retailers.find((r) => r.slug === pref) : undefined;
    setSelectedRetailer((prev) => {
      if (prev && retailers.some((r) => r.id === prev.id)) {
        return prev;
      }
      return fromPref ?? retailers[0] ?? null;
    });
  }, [retailers]);

  const priceRollup = useMemo(
    () => computeEstimatedMyrTotal(neededItems, priceMap),
    [neededItems, priceMap]
  );

  const pickRetailer = useCallback((r: ShopRetailerRow) => {
    setSelectedRetailer(r);
    if (isRetailerSlug(r.slug)) {
      setPreferredMalaysiaRetailerSlug(r.slug);
    }
  }, []);

  const estimateForItem = useCallback(
    (item: GroceryItem) => estimateLineMyr(item, priceMap),
    [priceMap]
  );

  const showPerLineEstimates =
    eligibility.status === "eligible" && !!selectedRetailer && neededItems.length > 0;

  return {
    eligibility,
    retailers,
    retailersLoading,
    selectedRetailer,
    pickRetailer,
    priceMap,
    pricesLoading,
    priceRollup,
    estimateLineMyr: estimateForItem,
    showPerLineEstimates,
  };
}
