import type { ImageSourcePropType } from "react-native";

export const ITEM_TYPES = ["all", "fridge", "cabinet", "freezer"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export type PantryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date?: Date;
  category: string;
  type: Exclude<ItemType, "all">;
  image_url: ImageSourcePropType | string | undefined;
  background_color: string | undefined;
  x: number;
  y: number;
  scale: number;
  created_at: Date;
  updated_at: Date;
  steps_to_store: StepsToStore[];
};

export type PantryItemConfirmation = {
  name: string;
  quantity: number;
  unit: string;
  background_color: string | undefined;
  image_url: ImageSourcePropType | string | undefined;
};

export type BaseIngredient = {
  days_to_expire: number;
  id: string;
  name: string;
  steps_to_store_id: string | null;
  storage_type: Exclude<ItemType, "all">;
};

type StepsToStore = {
  id: number;
  title: string;
  description: string;
  sequence: number;
};
