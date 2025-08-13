import React, { createContext, useContext } from "react";
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

  const setScale = (value: number) => {
    "worklet";
    try {
      scale.value = withTiming(value, CURVES["expressive.slow.spatial"]);
      // scale.value = withSpring(value, SPRINGS["spring.fast.spatial"]);
    } catch (error) {
      console.warn("Scale animation error:", error);
      scale.value = value;
    }
  };

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
