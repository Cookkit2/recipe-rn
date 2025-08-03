import type { ImageSourcePropType } from "react-native";

export const ITEM_TYPES = ["all", "fridge", "cabinet", "freezer"] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export type PantryItem = {
  id: number;
  name: string;
  quantity: string;
  expiry_date?: Date;
  category: string;
  type: Exclude<ItemType, "all">;
  image_url: ImageSourcePropType;
  x: number;
  y: number;
  scale: number;
  created_at: Date;
  updated_at: Date;
  steps_to_store: StepsToStore[];
};

type StepsToStore = {
  id: number;
  title: string;
  description: string;
  sequence: number;
};
