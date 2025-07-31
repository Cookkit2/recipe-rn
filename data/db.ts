import type { PantryItem } from "@/types/PantryItem";


export class DB extends Dexie {
  pantryItems!: Table<PantryItem>;
  constructor() {
    super("pantry-db");
    this.version(1).stores({
      pantryItems:
        "++id, name, quantity, expiry_date, category, type, image_url, x, y, scale, created_at, updated_at, steps_to_store",
    });
  }
}

export const db = new DB();
