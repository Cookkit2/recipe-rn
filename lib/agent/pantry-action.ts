import { z } from "zod";

const itemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  quantity: z.number().finite().nullable(),
  unit: z.string().nullable(),
  storageType: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
});
const resultSchema = z.object({
  ok: z.literal(true),
  status: z.enum(["added", "updated", "renamed", "merged", "removed"]),
  item: itemSchema.optional(),
  removed: z.array(itemSchema).optional(),
});
export interface PantryAction {
  id: string;
  undone?: boolean;
  status: "added" | "updated" | "renamed" | "merged" | "removed";
  items: z.infer<typeof itemSchema>[];
}
export type PantryAdditionReceipt = z.infer<typeof itemSchema> & {
  quantity: number;
  unit: string;
  updatedAt: string;
};
export function pantryActionFromResult(id: string, output: unknown): PantryAction | null {
  const parsed = resultSchema.safeParse(output);
  if (!parsed.success) return null;
  const { status, item, removed } = parsed.data;
  const items = status === "removed" ? (removed ?? []) : item ? [item] : [];
  return items.length ? { id, status, items } : null;
}
export function additionReceipt(action: PantryAction): PantryAdditionReceipt | null {
  const item = action.items[0];
  return action.status === "added" &&
    action.items.length === 1 &&
    item &&
    item.updatedAt &&
    item.quantity !== null &&
    item.unit !== null
    ? (item as PantryAdditionReceipt)
    : null;
}
