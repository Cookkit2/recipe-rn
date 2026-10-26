import type { TablesInsert } from "~/lib/supabase/supabase-types";

/** A stock mutation: omission preserves the catalog link; null explicitly clears it. */
export type SharedStockWrite = Pick<
  TablesInsert<"stock">,
  | "name"
  | "base_ingredient_id"
  | "quantity"
  | "unit"
  | "expiry_date"
  | "category"
  | "image_url"
  | "x"
  | "y"
  | "scale"
  | "added_by_user_id"
  | "created_at"
  | "updated_at"
> & { id: string; household_id: string };

const CATALOG_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Local stock supplies Watermelon's historical changed-column set. Migration
 * nulls have no identity marker and must preserve a server link. This marker
 * records changes over time; it is not local-versus-remote write provenance.
 * DTO/API callers omit the context, since their null is already an explicit clear.
 */
export function catalogReferenceField(
  value: string | null | undefined,
  changedColumns?: string
): {
  base_ingredient_id?: string | null;
} {
  if (
    value === null &&
    changedColumns !== undefined &&
    !changedColumns.split(",").includes("base_ingredient_id")
  )
    return {};
  return value === null || (typeof value === "string" && CATALOG_UUID.test(value))
    ? { base_ingredient_id: value }
    : {};
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const STRING_FIELDS = new Set([
  "unit",
  "expiry_date",
  "category",
  "image_url",
  "added_by_user_id",
  "created_at",
  "updated_at",
]);
const NUMBER_FIELDS = new Set(["quantity", "x", "y", "scale"]);

/** Validate serialized data before it can be replayed as a cloud mutation. */
export function isSharedStockWrite(value: unknown, householdId: string): value is SharedStockWrite {
  if (
    !isRecord(value) ||
    typeof value.id !== "string" ||
    !value.id ||
    typeof value.name !== "string" ||
    value.household_id !== householdId
  )
    return false;
  return Object.entries(value).every(([key, field]) => {
    if (key === "id" || key === "name" || key === "household_id") return true;
    if (key === "base_ingredient_id")
      return field === null || (typeof field === "string" && CATALOG_UUID.test(field));
    if (STRING_FIELDS.has(key)) return field === null || typeof field === "string";
    if (NUMBER_FIELDS.has(key))
      return field === null || (typeof field === "number" && Number.isFinite(field));
    return false;
  });
}
