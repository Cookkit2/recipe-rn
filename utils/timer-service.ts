/**
 * Timer Service
 *
 * Manages multiple cooking timers with notifications and voice announcements.
 * Timers persist across app restarts and continue running in the background.
 */

import * as Notifications from "expo-notifications";
import { AppState, type AppStateStatus } from "react-native";
import { log } from "~/utils/logger";
import { storage } from "~/data";
import { COOKING_TIMERS_KEY } from "~/constants/storage-keys";
import type { Timer, TimerCreateInput, TimerUpdateInput } from "~/types/Timer";
import { scheduleNotification, cancelNotification } from "~/lib/notifications/notification-service";

// Interval for updating timers (in milliseconds)
const TICK_INTERVAL = 1000;

/**
 * Calculate the remaining seconds based on timer state and elapsed time
 */
function calculateRemainingSeconds(timer: Timer): number {
  if (timer.status === "idle") {
    return timer.durationSeconds;
  }

  if (timer.status === "completed") {
    return 0;
  }

  const now = Date.now();
  let elapsed = 0;

  if (timer.startedAt && timer.status === "running") {
    // Timer is running - calculate elapsed time from start
    elapsed = Math.floor((now - timer.startedAt.getTime()) / 1000);

    // Subtract any paused time
    if (timer.pausedAt) {
      const pausedDuration = Math.floor((now - timer.pausedAt.getTime()) / 1000);
      // If pausedAt is set, the timer is currently paused
      // So we should not count time after pausedAt
      // The timer's pausedAt represents when the current pause started
      // We need to track total paused duration separately, but for now
      // we'll handle this in start/pause methods
    }
  } else if (timer.pausedAt && timer.status === "paused") {
    // Timer is paused - calculate elapsed time up to the pause
    if (timer.startedAt) {
      elapsed = Math.floor((timer.pausedAt.getTime() - timer.startedAt.getTime()) / 1000);
    }
  }

  const remaining = timer.durationSeconds - elapsed;
  return Math.max(0, remaining);
}

/**
 * Determine if a timer has completed based on elapsed time
 */
function isTimerCompleted(timer: Timer): boolean {
  return calculateRemainingSeconds(timer) <= 0;
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
export function formatTimerDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format seconds to human-readable text (e.g., "10 minutes" or "1 hour 30 minutes")
 */
export function formatTimerDurationText(seconds: number): string {
  const minutes = Math.ceil(seconds / 60);

  if (minutes < 60) {
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  return `${hours} hour${hours !== 1 ? "s" : ""} and ${remainingMinutes} minute${remainingMinutes !== 1 ? "s" : ""}`;
}

class TimerService {
  private timers: Map<string, Timer> = new Map();
  private timerIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private notificationIds: Map<string, string> = new Map();
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

  // Callbacks for timer state changes
  private timerUpdateCallbacks: Set<(timers: Timer[]) => void> = new Set();
  private timerCompleteCallbacks: Set<(timer: Timer) => void> = new Set();

  /**
   * Register a callback to be invoked when any timer is updated
   */
  onTimerUpdate(callback: (timers: Timer[]) => void): () => void {
    this.timerUpdateCallbacks.add(callback);
    return () => this.timerUpdateCallbacks.delete(callback);
  }

  /**
   * Register a callback to be invoked when a timer completes
   */
  onTimerComplete(callback: (timer: Timer) => void): () => void {
    this.timerCompleteCallbacks.add(callback);
    return () => this.timerCompleteCallbacks.delete(callback);
  }

  private notifyTimerUpdate(): void {
    const timers = this.getAllTimers();
    this.timerUpdateCallbacks.forEach((cb) => {
      try {
        cb(timers);
      } catch (error) {
        log.error("Error in timer update callback:", error);
      }
    });
  }

  private notifyTimerComplete(timer: Timer): void {
    this.timerCompleteCallbacks.forEach((cb) => {
      try {
        cb(timer);
      } catch (error) {
        log.error("Error in timer complete callback:", error);
      }
    });
  }

  /**
   * Initialize the timer service and restore persisted timers
   */
  async initialize(): Promise<void> {
    try {
      await this.restoreTimers();
      this.setupAppStateListener();
      log.info(`Timer service initialized with ${this.timers.size} timer(s)`);
    } catch (error) {
      log.error("Failed to initialize timer service:", error);
    }
  }

  /**
   * Restore timers from persistent storage
   */
  private async restoreTimers(): Promise<void> {
    try {
      const stored = storage.get(COOKING_TIMERS_KEY);
      if (stored) {
        const timersData = JSON.parse(stored as string) as Timer[];
        for (const timer of timersData) {
          // Convert date strings back to Date objects
          const restoredTimer: Timer = {
            ...timer,
            createdAt: new Date(timer.createdAt),
            startedAt: timer.startedAt ? new Date(timer.startedAt) : undefined,
            pausedAt: timer.pausedAt ? new Date(timer.pausedAt) : undefined,
            completedAt: timer.completedAt ? new Date(timer.completedAt) : undefined,
          };

          // Check if timer has completed while app was closed
          if (restoredTimer.status === "running" && isTimerCompleted(restoredTimer)) {
            restoredTimer.status = "completed";
            restoredTimer.completedAt = new Date();
          }

          // Resume tick interval for running/paused timers
          if (restoredTimer.status === "running" || restoredTimer.status === "paused") {
            this.startTickInterval(restoredTimer);
          }

          this.timers.set(restoredTimer.id, restoredTimer);
        }

        // Reconcile OS-scheduled notifications with restored timers
        try {
          const scheduled = await Notifications.getAllScheduledNotificationsAsync();

          for (const request of scheduled) {
            const data = (request.content?.data ?? {}) as any;
            const timerId = data.timerId as string | undefined;

            if (!timerId) {
              continue;
            }

            const restoredTimer = this.timers.get(timerId);

            // No matching timer in storage: cancel stale notification
            if (!restoredTimer) {
              try {
                await cancelNotification(request.identifier);
              } catch (cancelError) {
                log.error("Failed to cancel stale notification for missing timer:", cancelError);
              }
              continue;
            }

            // Timer exists but is not active anymore: cancel stale notification
            if (restoredTimer.status !== "running" && restoredTimer.status !== "paused") {
              try {
                await cancelNotification(request.identifier);
              } catch (cancelError) {
                log.error("Failed to cancel stale notification for inactive timer:", cancelError);
              }
              continue;
            }

            // Timer is active: rebuild in-memory notification mapping
            if (this.notificationIds) {
              this.notificationIds.set(timerId, request.identifier);
            }
          }
        } catch (notificationError) {
          log.error(
            "Failed to reconcile scheduled notifications with restored timers:",
            notificationError
          );
        }

        await this.persistTimers();
      }
    } catch (error) {
      log.error("Failed to restore timers:", error);
    }
  }

  /**
   * Persist timers to storage
   */
  private async persistTimers(): Promise<void> {
    try {
      const timersArray = Array.from(this.timers.values());
      storage.set(COOKING_TIMERS_KEY, JSON.stringify(timersArray));
    } catch (error) {
      log.error("Failed to persist timers:", error);
    }
  }

  /**
   * Start the tick interval for a timer
   */
  private startTickInterval(timer: Timer): void {
    // Clear existing interval if any
    this.stopTickInterval(timer.id);

    const interval = setInterval(() => {
      const currentTimer = this.timers.get(timer.id);
      if (!currentTimer) {
        this.stopTickInterval(timer.id);
        return;
      }

      const remaining = calculateRemainingSeconds(currentTimer);

      if (remaining <= 0 && currentTimer.status !== "completed") {
        // Timer completed
        this.completeTimer(currentTimer.id);
      } else {
        // Notify UI of countdown update
        this.notifyTimerUpdate();
      }
    }, TICK_INTERVAL);

    this.timerIntervals.set(timer.id, interval);
  }

  /**
   * Stop the tick interval for a timer
   */
  private stopTickInterval(timerId: string): void {
    const interval = this.timerIntervals.get(timerId);
    if (interval) {
      clearInterval(interval);
      this.timerIntervals.delete(timerId);
    }
  }

  /**
   * Create a new timer
   */
  async createTimer(input: TimerCreateInput): Promise<Timer> {
    const timer: Timer = {
      id: `timer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: input.name,
      durationSeconds: input.durationSeconds,
      remainingSeconds: input.durationSeconds,
      status: "idle",
      createdAt: new Date(),
      recipeId: input.recipeId,
      stepNumber: input.stepNumber,
    };

    this.timers.set(timer.id, timer);
    await this.persistTimers();
    this.notifyTimerUpdate();

    log.info(`Timer created: ${timer.name} (${timer.durationSeconds}s)`);
    return timer;
  }

  /**
   * Start a timer
   */
  async startTimer(timerId: string): Promise<void> {
    const timer = this.timers.get(timerId);
    if (!timer) {
      log.warn(`Timer not found: ${timerId}`);
      return;
    }

    if (timer.status === "running") {
      log.debug(`Timer already running: ${timer.name}`);
      return;
    }

    const now = new Date();

    // If resuming from pause, adjust startedAt to account for paused duration
    if (timer.status === "paused" && timer.startedAt && timer.pausedAt) {
      // Calculate how long the timer was running before pause
      const previousRunDuration = timer.pausedAt.getTime() - timer.startedAt.getTime();

      // Set new startedAt so that total elapsed time is correct
      timer.startedAt = new Date(now.getTime() - previousRunDuration);
      timer.pausedAt = undefined;
    } else {
      // Starting fresh or from idle
      timer.startedAt = now;
      timer.pausedAt = undefined;
    }

    timer.status = "running";
    timer.remainingSeconds = calculateRemainingSeconds(timer);

    // Schedule notification for completion
    await this.scheduleCompletionNotification(timer);

    // Start tick interval
    this.startTickInterval(timer);

    await this.persistTimers();
    this.notifyTimerUpdate();

    log.info(`Timer started: ${timer.name}`);
  }

  /**
   * Pause a running timer
   */
  async pauseTimer(timerId: string): Promise<void> {
    const timer = this.timers.get(timerId);
    if (!timer) {
      log.warn(`Timer not found: ${timerId}`);
      return;
    }

    if (timer.status !== "running") {
      log.debug(`Timer not running: ${timer.name}`);
      return;
    }

    timer.status = "paused";
    timer.pausedAt = new Date();
    timer.remainingSeconds = calculateRemainingSeconds(timer);

    // Cancel scheduled notification
    await this.cancelCompletionNotification(timer.id);

    // Stop tick interval
    this.stopTickInterval(timer.id);

    await this.persistTimers();
    this.notifyTimerUpdate();

    log.info(`Timer paused: ${timer.name}`);
  }

  /**
   * Resume a paused timer
   */
  async resumeTimer(timerId: string): Promise<void> {
    const timer = this.timers.get(timerId);
    if (!timer) {
      log.warn(`Timer not found: ${timerId}`);
      return;
    }

    if (timer.status !== "paused") {
      log.debug(`Timer not paused: ${timer.name}`);
      return;
    }

    await this.startTimer(timerId);
    log.info(`Timer resumed: ${timer.name}`);
  }

  /**
   * Cancel and delete a timer
   */
  async cancelTimer(timerId: string): Promise<void> {
    const timer = this.timers.get(timerId);
    if (!timer) {
      log.warn(`Timer not found: ${timerId}`);
      return;
    }

    // Cancel scheduled notification
    await this.cancelCompletionNotification(timerId);

    // Stop tick interval
    this.stopTickInterval(timerId);

    this.timers.delete(timerId);
    await this.persistTimers();
    this.notifyTimerUpdate();

    log.info(`Timer cancelled: ${timer.name}`);
  }

  /**
   * Mark a timer as completed
   */
  private async completeTimer(timerId: string): Promise<void> {
    const timer = this.timers.get(timerId);
    if (!timer) {
      return;
    }

    timer.status = "completed";
    timer.completedAt = new Date();
    timer.remainingSeconds = 0;

    // Stop tick interval
    this.stopTickInterval(timerId);

    await this.persistTimers();
    this.notifyTimerUpdate();
    this.notifyTimerComplete(timer);

    log.info(`Timer completed: ${timer.name}`);
  }

  /**
   * Update a timer's properties
   */
  async updateTimer(timerId: string, input: TimerUpdateInput): Promise<void> {
    const timer = this.timers.get(timerId);
    if (!timer) {
      log.warn(`Timer not found: ${timerId}`);
      return;
    }

    // Only allow name updates for now
    if (input.name !== undefined) {
      timer.name = input.name;
    }

    await this.persistTimers();
    this.notifyTimerUpdate();

    log.info(`Timer updated: ${timer.name}`);
  }

  /**
   * Get all timers
   */
  getAllTimers(): Timer[] {
    return Array.from(this.timers.values()).sort((a, b) => {
      // Sort by: running first, then by created time
      if (a.status === "running" && b.status !== "running") return -1;
      if (a.status !== "running" && b.status === "running") return 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Get a timer by ID
   */
  getTimer(timerId: string): Timer | undefined {
    const timer = this.timers.get(timerId);
    if (timer) {
      // Update remaining seconds based on current state
      return {
        ...timer,
        remainingSeconds: calculateRemainingSeconds(timer),
      };
    }
    return undefined;
  }

  /**
   * Get all active timers (running or paused)
   */
  getActiveTimers(): Timer[] {
    return this.getAllTimers().filter(
      (timer) => timer.status === "running" || timer.status === "paused"
    );
  }

  /**
   * Get timers associated with a specific recipe step
   */
  getTimersForStep(recipeId: string, stepNumber: number): Timer[] {
    return this.getAllTimers().filter(
      (timer) => timer.recipeId === recipeId && timer.stepNumber === stepNumber
    );
  }

  /**
   * Schedule a completion notification for a timer
   */
  private async scheduleCompletionNotification(timer: Timer): Promise<void> {
    try {
      const remainingSeconds = calculateRemainingSeconds(timer);

      if (remainingSeconds <= 0) {
        return;
      }

      const notificationId = await scheduleNotification({
        id: `timer_${timer.id}`,
        title: "Timer Complete!",
        body: `${timer.name} is done.`,
        trigger: {
          seconds: remainingSeconds,
        },
        sound: true,
      });

      this.notificationIds.set(timer.id, notificationId);
    } catch (error) {
      log.error("Failed to schedule timer notification:", error);
    }
  }

  /**
   * Cancel a completion notification for a timer
   */
  private async cancelCompletionNotification(timerId: string): Promise<void> {
    try {
      const notificationId = this.notificationIds.get(timerId);
      if (notificationId) {
        await cancelNotification(notificationId);
        this.notificationIds.delete(timerId);
      }
    } catch (error) {
      log.error("Failed to cancel timer notification:", error);
    }
  }

  /**
   * Cancel all timers
   */
  async cancelAllTimers(): Promise<void> {
    const timerIds = Array.from(this.timers.keys());
    for (const timerId of timerIds) {
      await this.cancelTimer(timerId);
    }
    log.info("All timers cancelled");
  }

  /**
   * Clean up completed timers older than a certain time
   */
  async cleanupCompletedTimers(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [id, timer] of this.timers) {
      if (
        timer.status === "completed" &&
        timer.completedAt &&
        now - timer.completedAt.getTime() > olderThanMs
      ) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.timers.delete(id);
      this.stopTickInterval(id);
    }

    if (toDelete.length > 0) {
      await this.persistTimers();
      this.notifyTimerUpdate();
      log.info(`Cleaned up ${toDelete.length} completed timer(s)`);
    }
  }

  /**
   * Handle app backgrounding - ensure timers are saved
   */
  async onAppBackground(): Promise<void> {
    await this.persistTimers();
    log.debug("Timer service saved state on background");
  }

  /**
   * Handle app foreground - restore and validate timers
   */
  async onAppForeground(): Promise<void> {
    await this.restoreTimers();
    log.debug("Timer service restored on foreground");
  }

  /**
   * Setup app state listener for automatic background/foreground handling
   */
  private setupAppStateListener(): void {
    // Remove existing listener if any
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState !== "active") {
        // App going to background - ensure timers are saved
        log.debug("[TimerService] App backgrounded, saving timer state");
        void this.onAppBackground();
      } else {
        // App coming to foreground - restore and validate timers
        log.debug("[TimerService] App foregrounded, restoring timer state");
        void this.onAppForeground();
      }
    };

    this.appStateSubscription = AppState.addEventListener("change", handleAppStateChange);
    log.debug("[TimerService] App state listener registered");
  }

  /**
   * Cleanup resources - remove app state listener and clear all intervals
   */
  cleanup(): void {
    // Remove app state listener
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
      log.debug("[TimerService] App state listener removed");
    }

    // Clear all timer intervals
    for (const timerId of this.timerIntervals.keys()) {
      this.stopTickInterval(timerId);
    }

    log.debug("[TimerService] Timer service cleaned up");
  }
}

// Singleton instance
export const timerService = new TimerService();
