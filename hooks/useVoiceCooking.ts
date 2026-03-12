/**
 * useVoiceCookingSettings Hook
 *
 * Manages voice cooking settings for the app. Provides reactive access to
 * voice cooking preferences and helper methods to toggle common settings.
 *
 * @example
 * ```tsx
 * const { settings, updateSettings, toggleEnabled, toggleAutoRead } = useVoiceCookingSettings();
 *
 * // Check if voice cooking is enabled
 * if (settings.enabled) {
 *   console.log("Voice cooking is active");
 * }
 *
 * // Update specific settings
 * updateSettings({ speechRate: 1.0 });
 *
 * // Toggle voice on/off
 * toggleEnabled();
 * ```
 */

import { useCallback, useState, useEffect } from "react";
import { voiceCookingService, type VoiceCookingSettingsType } from "~/utils/voice-cooking";

export function useVoiceCookingSettings() {
  const [settings, setSettings] = useState<VoiceCookingSettingsType>(
    voiceCookingService.getSettings()
  );

  // Reload settings on mount
  useEffect(() => {
    setSettings(voiceCookingService.getSettings());
  }, []);

  /**
   * Update one or more voice cooking settings
   * @param updates Partial settings object with properties to update
   */
  const updateSettings = useCallback((updates: Partial<VoiceCookingSettingsType>) => {
    voiceCookingService.updateSettings(updates);
    setSettings(voiceCookingService.getSettings());
  }, []);

  /**
   * Toggle voice cooking on/off
   */
  const toggleEnabled = useCallback(() => {
    const newEnabled = !settings.enabled;
    updateSettings({ enabled: newEnabled });
  }, [settings.enabled, updateSettings]);

  /**
   * Toggle auto-read steps on/off
   */
  const toggleAutoRead = useCallback(() => {
    const newAutoRead = !settings.autoReadSteps;
    updateSettings({ autoReadSteps: newAutoRead });
  }, [settings.autoReadSteps, updateSettings]);

  return {
    settings,
    updateSettings,
    toggleEnabled,
    toggleAutoRead,
  };
}
