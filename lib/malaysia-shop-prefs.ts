import { createMMKV } from "react-native-mmkv";

const storage = createMMKV({ id: "malaysia-shop-prefs" });

const PREFERRED_SLUG_KEY = "preferred_retailer_slug";

export type MalaysiaRetailerSlug = "speedmart_99" | "jaya_grocer";

export function getPreferredMalaysiaRetailerSlug(): MalaysiaRetailerSlug | null {
  const v = storage.getString(PREFERRED_SLUG_KEY);
  if (v === "speedmart_99" || v === "jaya_grocer") {
    return v;
  }
  return null;
}

export function setPreferredMalaysiaRetailerSlug(slug: MalaysiaRetailerSlug): void {
  storage.set(PREFERRED_SLUG_KEY, slug);
}
