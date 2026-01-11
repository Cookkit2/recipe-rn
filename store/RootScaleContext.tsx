import React, { createContext, useContext, useCallback } from "react";
import {
  type SharedValue,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { log } from "~/utils/logger";

interface RootScaleContextType {
  scale: SharedValue<number>;
  setScale: (value: number) => void;
}

const RootScaleContext = createContext<RootScaleContextType | null>(null);

export function RootScaleProvider({ children }: { children: React.ReactNode }) {
  const scale = useSharedValue(1);

  const setScale = useCallback(
    (value: number) => {
      try {
        scale.value = withSpring(value, {
          damping: 15,
          stiffness: 150,
          mass: 0.5,
        });
      } catch (error) {
        log.warn("Scale animation error:", error);
        scale.value = value;
      }
    },
    [scale]
  );

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
