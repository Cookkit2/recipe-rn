import { useCallback, useEffect, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  getNotificationPermissions,
  requestNotificationPermissions,
  type NotificationPermissionResult,
} from "~/lib/notifications";
import {
  notificationSettingsService,
  type NotificationSettings,
} from "~/utils/notification-settings";

interface UseNotificationSettingsState {
  settings: NotificationSettings;
  permission: NotificationPermissionResult | null;
  permissionDenied: boolean;
}

export function useNotificationSettings() {
  const [state, setState] = useState<UseNotificationSettingsState>({
    settings: notificationSettingsService.getSettings(),
    permission: null,
    permissionDenied: false,
  });

  const refreshSettings = useCallback(() => {
    setState((prev) => ({
      ...prev,
      settings: notificationSettingsService.getSettings(),
    }));
  }, []);

  const refreshPermissions = useCallback(async () => {
    try {
      const permission = await getNotificationPermissions();
      setState((prev) => ({
        ...prev,
        permission,
        permissionDenied: permission.status === "denied",
      }));
    } catch {
      // If we fail to read permissions, keep previous state.
    }
  }, []);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  // Refresh settings and permissions when the notification screen gains focus.
  // Proactively prompt for permission if the user has never been asked.
  useFocusEffect(
    useCallback(() => {
      refreshSettings();
      let cancelled = false;
      const run = async () => {
        try {
          const permission = await getNotificationPermissions();
          if (cancelled) return;
          setState((prev) => ({
            ...prev,
            permission,
            permissionDenied: permission.status === "denied",
          }));
          if (permission.status === "undetermined") {
            const result = await requestNotificationPermissions();
            if (cancelled) return;
            setState((prev) => ({
              ...prev,
              permission: result,
              permissionDenied: result.status === "denied",
            }));
            if (result.granted) {
              notificationSettingsService.updateSettings({ enabled: true });
              refreshSettings();
            }
          }
        } catch {
          // Ignore permission errors
        }
      };
      run();
      return () => {
        cancelled = true;
      };
    }, [refreshSettings])
  );

  const updateSettings = useCallback(
    (updates: Partial<NotificationSettings>) => {
      notificationSettingsService.updateSettings(updates);
      refreshSettings();
    },
    [refreshSettings]
  );

  const toggleEnabled = useCallback(async () => {
    const current = notificationSettingsService.getSettings();
    const nextEnabled = !current.enabled;

    if (nextEnabled) {
      // Request permissions before enabling.
      const result = await requestNotificationPermissions();

      setState((prev) => ({
        ...prev,
        permission: result,
        permissionDenied: result.status === "denied",
      }));

      if (!result.granted) {
        // Keep disabled if permission was not granted.
        notificationSettingsService.updateSettings({ enabled: false });
        refreshSettings();
        return;
      }
    }

    notificationSettingsService.updateSettings({ enabled: nextEnabled });
    refreshSettings();
  }, [refreshSettings]);

  const toggleIngredientExpiry = useCallback(() => {
    const current = notificationSettingsService.getSettings();
    updateSettings({ ingredientExpiry: !current.ingredientExpiry });
  }, [updateSettings]);

  const toggleAchievements = useCallback(() => {
    const current = notificationSettingsService.getSettings();
    updateSettings({ achievements: !current.achievements });
  }, [updateSettings]);

  const toggleChallenges = useCallback(() => {
    const current = notificationSettingsService.getSettings();
    updateSettings({ challenges: !current.challenges });
  }, [updateSettings]);

  return {
    settings: state.settings,
    permission: state.permission,
    permissionDenied: state.permissionDenied,
    updateSettings,
    toggleEnabled,
    toggleIngredientExpiry,
    toggleAchievements,
    toggleChallenges,
    refreshPermissions,
  };
}
