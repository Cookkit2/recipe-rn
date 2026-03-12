import type { ImageSourcePropType } from 'react-native';

export const ITEM_TYPES = ['all', 'fridge', 'cabinet', 'freezer'] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export type PantryItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  expiry_date?: Date;
  category: string;
  type: Exclude<ItemType, 'all'>;
  image_url: ImageSourcePropType | string | undefined;
  background_color: string | undefined;
  created_at: Date;
  updated_at: Date;
  steps_to_store: StepsToStore[];
  // Optional UI positioning metadata for camera-based flows
  x?: number;
  y?: number;
  scale?: number;
  // Base ingredient data (fetched from Supabase)
  base_ingredient_id?: string;
  base_ingredient_name?: string;
  synonyms?: Array<{ id: string; synonym: string }>;
  categories?: Array<{ id: string; name: string }>;
};

export type PantryItemConfirmation = Pick<PantryItem, 'name' | 'quantity' | 'unit' | 'background_color' | 'image_url'>;

export type BaseIngredient = {
  days_to_expire: number;
  id: string;
  name: string;
  steps_to_store_id: string | null;
  storage_type: Exclude<ItemType, 'all'>;
};

type StepsToStore = {
  id: number;
  title: string;
  description: string;
  sequence: number;
};
