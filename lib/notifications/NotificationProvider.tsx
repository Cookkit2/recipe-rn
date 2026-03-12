import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Notifications from "expo-notifications";
import { initializeNotifications } from "./notification-service";
import { dispatchNotificationResponse } from "./notification-handler";
import type { ForegroundNotificationBehavior } from "./notification-types";

// ============================================
// Context
// ============================================

interface NotificationContextValue {
  isInitialized: boolean;
}

const NotificationContext = createContext<NotificationContextValue>({
  isInitialized: false,
});

export function useNotificationContext(): NotificationContextValue {
  return useContext(NotificationContext);
}

// ============================================
// Last Response Hook
// ============================================

export function useLastNotificationResponse() {
  return Notifications.useLastNotificationResponse();
}

// ============================================
// Provider
// ============================================

interface NotificationProviderProps {
  children: React.ReactNode;
  onForegroundNotification?: (
    notification: Notifications.Notification,
  ) => ForegroundNotificationBehavior;
}

export function NotificationProvider({
  children,
  onForegroundNotification,
}: NotificationProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const coldStartHandled = useRef(false);

  // Initialize notification channel & foreground behavior
  useEffect(() => {
    (async () => {
      await initializeNotifications();

      // Set foreground notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          if (onForegroundNotification) {
            const behavior = onForegroundNotification(notification);
            return {
              shouldShowAlert: behavior.shouldShowBanner,
              shouldShowBanner: behavior.shouldShowBanner,
              shouldShowList: behavior.shouldShowList,
              shouldPlaySound: behavior.shouldPlaySound,
              shouldSetBadge: behavior.shouldSetBadge,
            };
          }

          // Default: show banner and play sound
          return {
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          };
        },
      });

      setIsInitialized(true);
    })();
  }, []);

  // Listen for notification taps (background + foreground)
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      dispatchNotificationResponse(response);
    });

    return () => subscription.remove();
  }, []);

  // Handle cold start: app launched from a notification tap
  useEffect(() => {
    if (coldStartHandled.current) return;

    const checkColdStart = async () => {
      // Wait for navigation to be ready
      await new Promise((resolve) => setTimeout(resolve, 500));

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (lastResponse) {
        coldStartHandled.current = true;
        dispatchNotificationResponse(lastResponse);
      }
    };

    checkColdStart();
  }, []);

  return (
    <NotificationContext.Provider value={{ isInitialized }}>
      {children}
    </NotificationContext.Provider>
  );
}
