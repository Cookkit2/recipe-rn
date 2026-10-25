import { Uniwind } from "uniwind";
import { storageFacade } from "~/data/storage";
import { PREF_COLOR_SCHEME_KEY } from "~/constants/storage-keys";

// Native headers capture their interface style when they mount. Restore before
// rendering the navigator so a saved dark preference never mounts a light bar.
try {
  const storedTheme = storageFacade.get<unknown>(PREF_COLOR_SCHEME_KEY);
  if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
    Uniwind.setTheme(storedTheme);
  }
} catch {
  // A broken preference must not prevent the app from launching.
  console.warn("Could not restore saved appearance; using the system default.");
}
