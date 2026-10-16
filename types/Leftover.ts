export type LeftoverStatus = "active" | "eaten" | "discarded";
export interface Leftover {
  id: string;
  name: string;
  servings: number;
  cookedAt: Date;
  recipeId?: string;
  remindAt?: Date;
  status: LeftoverStatus;
}
export type LeftoverInput = Omit<Leftover, "id" | "status">;
