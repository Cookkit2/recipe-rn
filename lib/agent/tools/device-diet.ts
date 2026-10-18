import { storage } from "~/data";
import {
  PREF_ALLERGENS_KEY,
  PREF_DIET_KEY,
  PREF_MACRO_TARGET_KEY,
  PREF_OTHER_ALLERGENS_KEY,
} from "~/constants/storage-keys";
import type { DietProfile } from "./planning";
import { parseCloudPreferences } from "./supabase-cooking-data";

function readStringList(key: string): string[] {
  const stored = storage.get<string | string[]>(key);
  if (Array.isArray(stored)) return stored.filter((item) => item.trim().length > 0);
  if (typeof stored !== "string" || !stored.trim()) return [];
  return stored
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/** Device diet prefs live in MMKV, the same keys the rest of the app reads. */
export function readDeviceDietProfile(): DietProfile | null {
  const diet = storage.get<string>(PREF_DIET_KEY);
  const allergens = [
    ...readStringList(PREF_ALLERGENS_KEY),
    ...readStringList(PREF_OTHER_ALLERGENS_KEY),
  ];
  const macroTarget =
    parseCloudPreferences({
      macroTarget: storage.get<unknown>(PREF_MACRO_TARGET_KEY),
    })?.macroTarget ?? null;
  if ((!diet || diet === "none") && allergens.length === 0 && !macroTarget) return null;
  return {
    diet: diet && diet !== "none" ? diet : null,
    allergens,
    macroTarget,
    source: "device",
  };
}
