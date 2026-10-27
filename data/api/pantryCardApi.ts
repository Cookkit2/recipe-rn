import { databaseFacade } from "~/data/db/DatabaseFacade";
import type { PantryCardItem } from "~/types/PantryItem";
import { mapStorageType } from "./pantry-storage-type";

/** A local stock read only; full ingredient relationships stay on the detail query. */
export async function fetchPantryCards(): Promise<PantryCardItem[]> {
  const stocks = await databaseFacade.getAllStock();
  return stocks.map((stock) => ({
    id: stock.id,
    name: stock.name,
    quantity: stock.quantity,
    unit: stock.unit,
    type: mapStorageType(stock.storageType),
    image_url: stock.imageUrl,
    background_color: stock.backgroundColor,
  }));
}
