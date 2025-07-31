import type { StaticImageData } from "next/image";

export type PantryItem = {
  id: number;
  name: string;
  quantity: string;
  expiry_date?: Date;
  category: string;
  type: "fridge" | "cabinet";
  image_url: StaticImageData;
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
