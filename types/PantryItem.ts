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
  x: number;
  y: number;
  scale: number;
  created_at: Date;
  updated_at: Date;
  steps_to_store: StepsToStore[];
};

export type PantryItemConfirmation = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  image_url: ImageSourcePropType | string | undefined;
};

type StepsToStore = {
  id: number;
  title: string;
  description: string;
  sequence: number;
};
