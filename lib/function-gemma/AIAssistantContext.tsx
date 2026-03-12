/**
 * AI Assistant Context
 *
 * Provides global state for the AI Assistant feature
 */

import React, { createContext, useContext, type ReactNode } from "react";

interface AIAssistantContextValue {
  isEnabled: boolean;
  setIsEnabled: (enabled: boolean) => void;
}

const AIAssistantContext = createContext<AIAssistantContextValue | undefined>(undefined);

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [isEnabled, setIsEnabled] = React.useState(true);

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
