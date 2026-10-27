import { useEffect, useSyncExternalStore } from "react";

const active = new Set<symbol>();
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const snapshot = () => active.size > 0;

/** Keep automatic prompts out of manual import dialogs and in-flight extraction/save work. */
export function useRecipeImportActivity(busy: boolean) {
  useEffect(() => {
    if (!busy) return;
    const token = Symbol();
    active.add(token);
    listeners.forEach((listener) => listener());
    return () => {
      active.delete(token);
      listeners.forEach((listener) => listener());
    };
  }, [busy]);
}

export function useRecipeImportBusy() {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
