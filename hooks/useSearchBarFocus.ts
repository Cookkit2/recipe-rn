import { useCallback, useMemo, useRef, type RefObject } from "react";
import { useFocusEffect, useNavigation, type NativeStackNavigationProp } from "expo-router";
import type { SearchBarCommands } from "react-native-screens";

/** Focus native search after both its ref and the visible screen are ready. */
export function useSearchBarFocus(enabled = true) {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, undefined>>>();
  const commands = useRef<SearchBarCommands | null>(null);
  const frame = useRef<number | null>(null);
  const didFocus = useRef(false);
  const onFocus = useCallback(() => {
    didFocus.current = true;
  }, []);

  const cancelFocus = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const requestFocus = useCallback(() => {
    cancelFocus();
    if (!enabled || didFocus.current || !navigation.isFocused() || !commands.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (enabled && !didFocus.current && navigation.isFocused()) commands.current?.focus();
    });
  }, [cancelFocus, enabled, navigation]);

  // Stack.SearchBar accepts an object ref. Its setter also observes native
  // attachment, which can happen after the screen's focus effect has run.
  const searchBarRef = useMemo<RefObject<SearchBarCommands | null>>(
    () => ({
      get current() {
        return commands.current;
      },
      set current(instance) {
        commands.current = instance;
        if (instance) requestFocus();
        else cancelFocus();
      },
    }),
    [cancelFocus, requestFocus]
  );

  useFocusEffect(
    useCallback(() => {
      didFocus.current = false;
      // Ref attachment covers late header mounts and direct entry. Transition
      // completion retries when iOS refused focus during the opening animation.
      const unsubscribe = navigation.addListener("transitionEnd", requestFocus);
      requestFocus();
      return () => {
        unsubscribe();
        cancelFocus();
      };
    }, [cancelFocus, navigation, requestFocus])
  );

  return { searchBarRef, onFocus };
}
