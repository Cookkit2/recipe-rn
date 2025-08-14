import React, { createContext, useContext, useCallback } from "react";
import {
  type SharedValue,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { CURVES } from "~/constants/curves";

interface RootScaleContextType {
  scale: SharedValue<number>;
  setScale: (value: number) => void;
}

const RootScaleContext = createContext<RootScaleContextType | null>(null);

export function RootScaleProvider({ children }: { children: React.ReactNode }) {
  const scale = useSharedValue(1);

  const setScale = useCallback((value: number) => {
    try {
      scale.value = withTiming(value, CURVES["expressive.slow.spatial"]);
    } catch (error) {
      console.warn("Scale animation error:", error);
      scale.value = value;
    }
  }, [scale]);

  return (
    <RootScaleContext.Provider value={{ scale, setScale }}>
      {children}
    </RootScaleContext.Provider>
  );
}

export const useRootScale = () => {
  const context = useContext(RootScaleContext);
  if (!context) {
    throw new Error("useRootScale must be used within a RootScaleProvider");
  }
  return context;
};
