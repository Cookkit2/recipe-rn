/**
 * AI Assistant Context
 *
 * Provides global state for the AI Assistant feature
 */

import React, { createContext, useContext, type ReactNode } from "react";
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";

interface AIAssistantContextValue {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
}

const AIAssistantContext = createContext<AIAssistantContextValue | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  // Remote master switch: on-device AI is dark-launched behind the `on_device_ai`
  // feature flag (default off). `userEnabled` preserves a local opt-out toggle
  // layered on top of the flag.
  const { enabled: flagEnabled } = useFeatureFlag("on_device_ai");
  const [userEnabled, setUserEnabled] = React.useState(true);
  const isEnabled = flagEnabled && userEnabled;
  const setIsEnabled = (enabled: boolean) => setUserEnabled(enabled);

  return (
    <AIAssistantContext.Provider value={{ isEnabled, setIsEnabled }}>
      {children}
    </AIAssistantContext.Provider>
  );
}

export function useAIAssistantContext() {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error("useAIAssistantContext must be used within AIAssistantProvider");
  }
  return context;
}
