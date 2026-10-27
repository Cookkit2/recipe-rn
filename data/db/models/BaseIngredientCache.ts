import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

/** Row IDs are local implementation details; catalogId is the cloud identity. */
export default class BaseIngredientCache extends Model {
  static table = "base_ingredient_cache";
  @field("catalog_id") catalogId!: string;
  @field("name") name!: string;
  @field("lookup_key") lookupKey!: string;
}
