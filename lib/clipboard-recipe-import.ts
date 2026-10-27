import {
  clipboardRecipeIdentity,
  getClipboardRecipe,
  type ClipboardRecipe,
} from "~/utils/clipboard-recipe";

interface ClipboardRecipeMonitorOptions {
  read: () => Promise<string>;
  hash: (identity: string) => Promise<string>;
  available: () => boolean;
  version?: () => number;
  readHistory: () => string[];
  writeHistory: (history: string[]) => void;
  prompt: (recipe: ClipboardRecipe, reply: (accept: boolean) => void) => void;
  onImport: (recipe: ClipboardRecipe) => void;
}

/** Serialize clipboard reads; persist only bounded digests, never clipboard text. */
export function createClipboardRecipeMonitor(options: ClipboardRecipeMonitorOptions) {
  let reading = false;
  let prompting = false;
  let generation = 0;
  let queued = false;
  const monitor = {
    pause() {
      generation += 1;
    },
    async check(): Promise<void> {
      if (prompting || !options.available()) return;
      if (reading) {
        queued = true;
        return;
      }
      reading = true;
      queued = false;
      const started = generation;
      const version = options.version?.();
      const stale = () => started !== generation || version !== options.version?.();
      const available = () => !stale() && options.available();
      try {
        const recipe = getClipboardRecipe(await options.read());
        if (!recipe || !available()) return;
        const identity = await options.hash(clipboardRecipeIdentity(recipe));
        if (!available()) return;
        const history = options.readHistory();
        if (history.includes(identity)) return;
        options.writeHistory([...history, identity].slice(-100));
        prompting = true;
        let answered = false;
        options.prompt(recipe, (accept) => {
          if (answered) return;
          answered = true;
          prompting = false;
          if (accept && options.available()) options.onImport(recipe);
        });
      } catch {
        // Clipboard denial, missing native support, and storage errors are non-blocking.
        prompting = false;
      } finally {
        reading = false;
        if (queued && stale() && options.available()) await monitor.check();
        queued = false;
      }
    },
  };
  return monitor;
}
