import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables } from "~/lib/supabase/supabase-types";
import type { PriceEstimateRow } from "~/utils/grocery-price-estimate";

export type ShopRetailerRow = Tables<"shop_retailer">;

function parseNumeric(n: number | string | null | undefined): number {
  if (n === null || n === undefined) {
    return NaN;
  }
  if (typeof n === "number") {
    return n;
  }
  const v = parseFloat(n);
  return Number.isFinite(v) ? v : NaN;
}

function defaultGrabJayaUrl(): string {
  return process.env.EXPO_PUBLIC_GRAB_JAYA_GROCER_URL ?? "https://food.grab.com/my/en";
}

function getFallbackRetailers(): ShopRetailerRow[] {
  return [
    {
      id: "00000000-0000-4000-8000-000000000001",
      slug: "speedmart_99",
      display_name: "99 Speedmart",
      country_code: "MY",
      channel_type: "google_maps",
      maps_search_query: "99 Speedmart",
      grab_open_url: null,
      is_active: true,
      sort_order: 0,
      updated_at: null,
    },
    {
      id: "00000000-0000-4000-8000-000000000002",
      slug: "jaya_grocer",
      display_name: "Jaya Grocer",
      country_code: "MY",
      channel_type: "grab",
      maps_search_query: null,
      grab_open_url: defaultGrabJayaUrl(),
      is_active: true,
      sort_order: 1,
      updated_at: null,
    },
  ];
}

export class ShopRetailerApi {
  constructor(private readonly client: SupabaseClient<Database> | null) {}

  async listMalaysiaRetailers(): Promise<ShopRetailerRow[]> {
    if (!this.client) {
      return getFallbackRetailers().filter((r) => r.is_active);
    }

    const { data, error } = await this.client
      .from("shop_retailer")
      .select("*")
      .eq("country_code", "MY")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("[ShopRetailerApi] listMalaysiaRetailers failed, using fallback:", error.message);
      }
      return getFallbackRetailers().filter((r) => r.is_active);
    }

    if (!data?.length) {
      return getFallbackRetailers().filter((r) => r.is_active);
    }

    return data;
  }

  async fetchPriceEstimates(
    retailerId: string,
    ingredientKeys: string[]
  ): Promise<Map<string, PriceEstimateRow>> {
    const map = new Map<string, PriceEstimateRow>();
    if (!this.client) {
      return map;
    }

    const unique = [...new Set(ingredientKeys.map((k) => k.trim().toLowerCase()))].filter(Boolean);
    if (unique.length === 0) {
      return map;
    }

    const { data, error } = await this.client
      .from("ingredient_retailer_price_estimate")
      .select("ingredient_key, price_myr, bundle_quantity, bundle_unit")
      .eq("retailer_id", retailerId)
      .in("ingredient_key", unique);

    if (error) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("[ShopRetailerApi] fetchPriceEstimates:", error.message);
      }
      return map;
    }

    for (const row of data ?? []) {
      const price = parseNumeric(row.price_myr);
      const bundleQty = parseNumeric(row.bundle_quantity);
      if (!Number.isFinite(price) || !Number.isFinite(bundleQty) || bundleQty <= 0) {
        continue;
      }
      map.set(row.ingredient_key.toLowerCase(), {
        ingredientKey: row.ingredient_key.toLowerCase(),
        priceMyr: price,
        bundleQuantity: bundleQty,
        bundleUnit: row.bundle_unit,
      });
    }

    return map;
  }
}
