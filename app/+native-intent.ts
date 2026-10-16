import { redirectSharedRecipeIntent } from "~/utils/native-share-route";
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // The native share hook reads the original URL; avoid rendering a not-found screen first.
  return redirectSharedRecipeIntent(path);
}
