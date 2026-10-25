import { z } from "zod";
import type { CookingDataClient } from "./tools/planning";

export const PANTRY_READ_ERROR = "Couldn't load your pantry. Please try again.";
export const pantryReadInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export const pantryReadResultSchema = z
  .object({
    items: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          quantity: z.number().finite().nullable(),
          unit: z.string().nullable(),
          expiryDate: z.string().nullable(),
        })
      )
      .max(100),
    totalCount: z.number().int().nonnegative(),
    offset: z.number().int().nonnegative(),
    truncated: z.boolean(),
  })
  .refine(
    (result) =>
      (result.items.length === 0
        ? result.offset >= result.totalCount
        : result.offset + result.items.length <= result.totalCount) &&
      result.truncated === result.offset + result.items.length < result.totalCount,
    { message: "Pantry page metadata does not match its rows." }
  );
export type PantryReadResult = z.infer<typeof pantryReadResultSchema>;

export async function runGetPantry(
  data: Pick<CookingDataClient, "listPantry">,
  input: { limit?: number; offset?: number }
): Promise<PantryReadResult> {
  try {
    const { limit, offset } = pantryReadInputSchema.parse(input);
    const pantry = await data.listPantry();
    const items = [...pantry]
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      .slice(offset, offset + limit)
      .map(({ id, name, quantity, unit, expiryDate }) => ({
        id,
        name,
        quantity,
        unit,
        expiryDate,
      }));

    return pantryReadResultSchema.parse({
      items,
      totalCount: pantry.length,
      offset,
      truncated: offset + items.length < pantry.length,
    });
  } catch {
    throw new Error(PANTRY_READ_ERROR);
  }
}

export function formatPantryRead(result: PantryReadResult): string {
  return formatValidatedPantryRead(pantryReadResultSchema.parse(result));
}

/** Format sequential pages without treating an earlier truncated page as the final result. */
export function formatPantryReadPages(pages: PantryReadResult[]): string {
  try {
    const validated = pages.map((page) => pantryReadResultSchema.parse(page));
    const first = validated[0];
    if (!first) throw new Error(PANTRY_READ_ERROR);
    const items: PantryReadResult["items"] = [];
    const rowIds = new Set<string>();
    let nextOffset = first.offset;
    for (const page of validated) {
      if (page.totalCount !== first.totalCount || page.offset !== nextOffset)
        throw new Error(PANTRY_READ_ERROR);
      for (const item of page.items) {
        if (rowIds.has(item.id)) throw new Error(PANTRY_READ_ERROR);
        rowIds.add(item.id);
        items.push(item);
      }
      nextOffset += page.items.length;
    }
    return formatValidatedPantryRead({
      items,
      totalCount: first.totalCount,
      offset: first.offset,
      truncated: nextOffset < first.totalCount,
    });
  } catch {
    throw new Error(PANTRY_READ_ERROR);
  }
}

function formatValidatedPantryRead({
  items,
  totalCount,
  offset,
  truncated,
}: PantryReadResult): string {
  if (totalCount === 0) return "Your pantry is empty.";
  if (items.length === 0) return `No pantry entries on this page (${totalCount} total).`;

  const rows = items.map((item) => {
    const amount =
      item.quantity === null
        ? `quantity not recorded; ${item.unit === null ? "unit not recorded" : `unit ${item.unit}`}`
        : `${item.quantity}${item.unit === null ? "; unit not recorded" : ` ${item.unit}`}`;
    const expiry = item.expiryDate === null ? "" : `; expiry ${item.expiryDate}`;
    return `${item.name}: ${amount}${expiry}`;
  });
  const lines = [
    `Pantry (entries ${offset + 1}–${offset + items.length} of ${totalCount}):`,
    ...rows,
  ];
  if (offset > 0 || truncated) lines.push("This is a partial pantry list.");
  if (truncated) lines.push("More pantry entries remain.");
  return lines.join("\n");
}
