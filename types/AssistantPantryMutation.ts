export interface AssistantPantryInput {
  action: "add" | "remove" | "rename" | "merge";
  name?: string;
  quantity?: number;
  unit?: string;
  stockId?: string;
  targetStockId?: string;
  keepSeparate?: boolean;
}

export interface PantryCandidate {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  storageType?: string;
  expiryDate: string | null;
}

export type PantryMutationProblem =
  | { ok: false; status: "needs_clarification"; question: string; candidates?: PantryCandidate[] }
  | { ok: false; status?: "error"; error: string };

export type PantryWriteResult<T> =
  | { ok: true; status?: "added" | "updated" | "renamed" | "merged"; item: T }
  | PantryMutationProblem;

export type PantryRemovalResult<T> =
  { ok: true; status?: "removed"; removed: T[] } | PantryMutationProblem;

export type AssistantPantryResult<T> = PantryWriteResult<T> | PantryRemovalResult<T>;
