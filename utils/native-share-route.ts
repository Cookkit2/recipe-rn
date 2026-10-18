export function isSharedRecipeIntent(path: string): boolean {
  // Keep older installed share-extension URLs safe during the native migration.
  if (/^(?:cookkit:\/\/)?dataUrl=/i.test(path)) return true;
  if (/^\/?expo-sharing\/?(?:[?#].*)?$/i.test(path)) return true;
  try {
    const url = new URL(path);
    return url.protocol === "cookkit:" && url.hostname === "expo-sharing";
  } catch {
    return false;
  }
}

export function redirectSharedRecipeIntent(path: string): string {
  // Keep native navigation on the receiving screen; redirecting to Pantry races
  // with a warm share updating that screen's parameters.
  return isSharedRecipeIntent(path) ? "/import-recipe" : path;
}
