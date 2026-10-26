import { Model } from "@nozbe/watermelondb";
import { field } from "@nozbe/watermelondb/decorators";

export default class BaseIngredientAliasCache extends Model {
  static table = "base_ingredient_alias_cache";
  @field("base_ingredient_id") baseIngredientId!: string;
  @field("alias") alias!: string;
  @field("lookup_key") lookupKey!: string;
}
