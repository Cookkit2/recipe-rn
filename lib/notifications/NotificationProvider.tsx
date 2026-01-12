import * as Notifications from "expo-notifications";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from "react";

import { handleNotificationResponse } from "./notification-handler";
import { initializeNotifications } from "./notification-service";
import type {
  ForegroundNotificationBehavior,
  NotificationProviderProps,
} from "./notification-types";

/**
 * Default foreground notification behavior
 */
const DEFAULT_FOREGROUND_BEHAVIOR: ForegroundNotificationBehavior = {
  shouldShowBanner: true,
  shouldShowList: true,
  shouldPlaySound: true,
  shouldSetBadge: false,
};

/**
 * Context for notification state (can be extended for additional features)
 */
interface NotificationContextValue {
  /** Whether notification listeners are initialized */
  isInitialized: boolean;
}

const NotificationContext = createContext<NotificationContextValue>({
  isInitialized: false,
});

/**
 * Hook to access notification context
 */
export function useNotificationContext(): NotificationContextValue {
  return useContext(NotificationContext);
}

/**
 * NotificationProvider - Manages notification listeners and initialization
 *
 * Wrap your app with this provider to:
 * - Initialize notification settings (Android channels, etc.)
 * - Set up foreground notification handler
 * - Listen for notification responses (taps)
 * - Handle cold-start notifications (app launched from notification)
 */
export function NotificationProvider({
  children,
  onForegroundNotification,
}: NotificationProviderProps): React.JSX.Element {
  const isInitialized = useRef(false);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const receivedListener = useRef<Notifications.EventSubscription | null>(null);

  // Memoize the foreground behavior callback
  const getForegroundBehavior = useCallback(
    (notification: Notifications.Notification): ForegroundNotificationBehavior => {
      if (onForegroundNotification) {
        return onForegroundNotification(notification);
      }
      return DEFAULT_FOREGROUND_BEHAVIOR;
    },
    [onForegroundNotification]
  );

  // Initialize notifications and set up listeners
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    // Initialize notification settings (Android channel, etc.)
    initializeNotifications();

    // Set up foreground notification handler
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const behavior = getForegroundBehavior(notification);
        return {
          shouldShowAlert: behavior.shouldShowBanner, // Legacy support
          shouldShowBanner: behavior.shouldShowBanner,
          shouldShowList: behavior.shouldShowList,
          shouldPlaySound: behavior.shouldPlaySound,
          shouldSetBadge: behavior.shouldSetBadge,
        };
      },
    });

    // Handle notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        handleNotificationResponse(response);
      }
    );

    // Optional: Handle received notifications in foreground
    receivedListener.current = Notifications.addNotificationReceivedListener(
      (_notification) => {
        // Notification received while app is in foreground
        // The display behavior is handled by setNotificationHandler above
        // Add custom logic here if needed (e.g., update UI state)
      }
    );

    // Handle cold-start: check for notification that launched the app
    handleColdStartNotification();

    // Cleanup listeners on unmount
    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
        responseListener.current = null;
      }
      if (receivedListener.current) {
        receivedListener.current.remove();
        receivedListener.current = null;
      }
    };
  }, [getForegroundBehavior]);

  return (
    <NotificationContext.Provider value={{ isInitialized: isInitialized.current }}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Handle cold-start notifications
 * Check if the app was launched from a notification tap
 */
async function handleColdStartNotification(): Promise<void> {
  try {
    // Get the last notification response (if app was launched from notification)
    const lastResponse = await Notifications.getLastNotificationResponseAsync();

    if (lastResponse) {
      // Small delay to ensure navigation is ready
      setTimeout(() => {
        handleNotificationResponse(lastResponse);
      }, 500);

      // Clear the last response to prevent re-handling
      Notifications.clearLastNotificationResponseAsync();
    }
  } catch (error) {
    console.warn("[NotificationProvider] Error handling cold-start notification:", error);
  }
}

/**
 * Hook to use the last notification response
 * Useful for handling notifications that launched the app
 */
export function useLastNotificationResponse(): Notifications.NotificationResponse | null | undefined {
  return Notifications.useLastNotificationResponse();
}
