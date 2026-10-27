import { useCallback, useMemo, useRef, type RefObject } from "react";
import { Keyboard } from "react-native";
import { useFocusEffect, useNavigation, type NativeStackNavigationProp } from "expo-router";
import type { SearchBarCommands } from "react-native-screens";

const FOCUS_RETRY_MS = 100;
const FOCUS_WINDOW_MS = 2000;

/** Retry initial native focus until the keyboard appears, without refocusing after dismissal. */
export function useSearchBarFocus(enabled = true) {
  const navigation = useNavigation<NativeStackNavigationProp<Record<string, undefined>>>();
  const commands = useRef<SearchBarCommands | null>(null);
  const frame = useRef<number | null>(null);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cycle = useRef({ active: false, confirmed: false, nativeFocused: false, deadline: 0 });

  const cancelFrame = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const cancelPending = useCallback(() => {
    cancelFrame();
    if (retry.current !== null) clearTimeout(retry.current);
    retry.current = null;
  }, [cancelFrame]);

  const confirmFocus = useCallback(() => {
    if (!cycle.current.active || !cycle.current.nativeFocused || !Keyboard.isVisible()) return;
    cycle.current.confirmed = true;
    cancelPending();
  }, [cancelPending]);

  const onFocus = useCallback(() => {
    cycle.current.nativeFocused = true;
    confirmFocus();
  }, [confirmFocus]);

  const onBlur = useCallback(() => {
    cycle.current.nativeFocused = false;
  }, []);

  const requestFocus = useCallback((): void => {
    const canAttempt = () =>
      enabled &&
      cycle.current.active &&
      !cycle.current.confirmed &&
      navigation.isFocused() &&
      (cycle.current.deadline === 0 || Date.now() < cycle.current.deadline);
    if (!canAttempt() || frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      if (!canAttempt()) return;
      const instance = commands.current;
      if (!instance) return; // Late ref attachment starts the attempt, without polling an absent field.
      if (cycle.current.deadline === 0) cycle.current.deadline = Date.now() + FOCUS_WINDOW_MS;
      confirmFocus();
      if (cycle.current.confirmed) return;
      // An imperative ref can attach before UIKit installs its search controller.
      // A focus command has no success result, so wait for native keyboard acknowledgement.
      instance.focus();
      if (canAttempt() && retry.current === null) {
        retry.current = setTimeout(() => {
          retry.current = null;
          requestFocus();
        }, FOCUS_RETRY_MS);
      }
    });
  }, [confirmFocus, enabled, navigation]);

  const searchBarRef = useMemo<RefObject<SearchBarCommands | null>>(
    () => ({
      get current() {
        return commands.current;
      },
      set current(instance) {
        commands.current = instance;
        if (instance) requestFocus();
        // react-native-screens reattaches this ref on rerenders. Preserve the
        // retry window across detach/attach instead of resetting or losing it.
        else cancelFrame();
      },
    }),
    [cancelFrame, requestFocus]
  );

  useFocusEffect(
    useCallback(() => {
      cancelPending();
      cycle.current = {
        active: enabled,
        confirmed: false,
        nativeFocused: false,
        deadline: 0,
      };
      if (!enabled) return;
      const keyboard = Keyboard.addListener("keyboardDidShow", confirmFocus);
      const unsubscribe = navigation.addListener("transitionEnd", requestFocus);
      requestFocus();
      return () => {
        cycle.current.active = false;
        keyboard.remove();
        unsubscribe();
        cancelPending();
      };
    }, [cancelPending, confirmFocus, enabled, navigation, requestFocus])
  );

  return { searchBarRef, onFocus, onBlur };
}
