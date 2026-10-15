export function redirectSharedRecipeIntent(path: string): string {
  return /^(?:cookkit:\/\/)?dataUrl=/i.test(path) ? "/" : path;
}
