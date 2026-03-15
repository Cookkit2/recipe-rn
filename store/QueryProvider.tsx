import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create a client with optimized defaults for mobile
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh
      staleTime: 5 * 60 * 1000, // 5 minutes

      // Cache time - how long data stays in cache after component unmounts
      gcTime: 10 * 60 * 1000, // 10 minutes (was cacheTime in v4)

      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on certain errors
        if (error instanceof Error && error.message.includes("not found")) {
          return false;
        }
        return failureCount < 3;
      },

      // Background refetch settings
      refetchOnWindowFocus: false, // Mobile doesn't have window focus
      refetchOnReconnect: true, // Refetch when network reconnects

      // Network mode for offline support
      networkMode: "offlineFirst",
    },
    mutations: {
      // Retry mutations on network errors
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes("network")) {
          return failureCount < 2;
        }
        return false;
      },
      networkMode: "offlineFirst",
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export { queryClient };
