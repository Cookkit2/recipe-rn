import { redirectSharedRecipeIntent } from "~/utils/native-share-route";
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  // The receiver fills this form from the native payload once navigation is ready.
  return redirectSharedRecipeIntent(path);
}
