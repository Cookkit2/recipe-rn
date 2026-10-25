import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import { useFocusEffect } from "expo-router";
import RecipeLoadingGlowOverlay from "./RecipeLoadingGlowOverlay";

type RegisterLoading = (token: symbol) => () => void;
const LoadingContext = createContext<RegisterLoading>(() => () => {});

/** Keep the exit fade mounted across import → saved recipe navigation. */
export function RecipeLoadingGlowProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<ReadonlySet<symbol>>(() => new Set());
  const register = useCallback<RegisterLoading>((token) => {
    setTasks((current) => new Set(current).add(token));
    return () => {
      setTasks((current) => {
        if (!current.has(token)) return current;
        const next = new Set(current);
        next.delete(token);
        return next;
      });
    };
  }, []);
  return (
    <LoadingContext.Provider value={register}>
      <View style={{ flex: 1 }}>
        {children}
        <RecipeLoadingGlowOverlay active={tasks.size > 0} />
      </View>
    </LoadingContext.Provider>
  );
}

/** Release on blur/unmount as well as success/error; overlapping tasks stay independent. */
export function useRecipeLoadingGlow(active: boolean) {
  const register = useContext(LoadingContext);
  const token = useRef(Symbol("recipe-loading"));
  useFocusEffect(
    useCallback(() => (active ? register(token.current) : undefined), [active, register])
  );
}
