import React, { createContext, useContext, useCallback, useEffect, useState } from "react";
import { log } from "~/utils/logger";
import type { Timer, TimerCreateInput, TimerUpdateInput } from "~/types/Timer";
import { timerService } from "~/utils/timer-service";

interface TimerContextType {
  timers: Timer[];
  activeTimers: Timer[];
  isLoading: boolean;
  createTimer: (input: TimerCreateInput) => Promise<Timer>;
  startTimer: (timerId: string) => Promise<void>;
  pauseTimer: (timerId: string) => Promise<void>;
  resumeTimer: (timerId: string) => Promise<void>;
  cancelTimer: (timerId: string) => Promise<void>;
  updateTimer: (timerId: string, input: TimerUpdateInput) => Promise<void>;
  cancelAllTimers: () => Promise<void>;
  getTimersForStep: (recipeId: string, stepNumber: number) => Timer[];
  refreshTimers: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize timer service on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        await timerService.initialize();
        if (mounted) {
          setTimers(timerService.getAllTimers());
          setIsLoading(false);
        }
      } catch (error) {
        log.error("Failed to initialize timer service:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    initialize();

    // Subscribe to timer updates
    const unsubscribeUpdate = timerService.onTimerUpdate((updatedTimers) => {
      if (mounted) {
        setTimers(updatedTimers);
      }
    });

    return () => {
      mounted = false;
      unsubscribeUpdate();
    };
  }, []);

  const refreshTimers = useCallback(() => {
    setTimers(timerService.getAllTimers());
  }, []);

  const createTimer = useCallback(async (input: TimerCreateInput): Promise<Timer> => {
    try {
      const timer = await timerService.createTimer(input);
      log.info(`Timer created: ${timer.name}`);
      return timer;
    } catch (error) {
      log.error("Failed to create timer:", error);
      throw error;
    }
  }, []);

  const startTimer = useCallback(async (timerId: string): Promise<void> => {
    try {
      await timerService.startTimer(timerId);
      log.info(`Timer started: ${timerId}`);
    } catch (error) {
      log.error("Failed to start timer:", error);
      throw error;
    }
  }, []);

  const pauseTimer = useCallback(async (timerId: string): Promise<void> => {
    try {
      await timerService.pauseTimer(timerId);
      log.info(`Timer paused: ${timerId}`);
    } catch (error) {
      log.error("Failed to pause timer:", error);
      throw error;
    }
  }, []);

  const resumeTimer = useCallback(async (timerId: string): Promise<void> => {
    try {
      await timerService.resumeTimer(timerId);
      log.info(`Timer resumed: ${timerId}`);
    } catch (error) {
      log.error("Failed to resume timer:", error);
      throw error;
    }
  }, []);

  const cancelTimer = useCallback(async (timerId: string): Promise<void> => {
    try {
      await timerService.cancelTimer(timerId);
      log.info(`Timer cancelled: ${timerId}`);
    } catch (error) {
      log.error("Failed to cancel timer:", error);
      throw error;
    }
  }, []);

  const updateTimer = useCallback(
    async (timerId: string, input: TimerUpdateInput): Promise<void> => {
      try {
        await timerService.updateTimer(timerId, input);
        log.info(`Timer updated: ${timerId}`);
      } catch (error) {
        log.error("Failed to update timer:", error);
        throw error;
      }
    },
    []
  );

  const cancelAllTimers = useCallback(async (): Promise<void> => {
    try {
      await timerService.cancelAllTimers();
      log.info("All timers cancelled");
    } catch (error) {
      log.error("Failed to cancel all timers:", error);
      throw error;
    }
  }, []);

  const getTimersForStep = useCallback(
    (recipeId: string, stepNumber: number): Timer[] => {
      return timerService.getTimersForStep(recipeId, stepNumber);
    },
    []
  );

  // Derived state: active timers (running or paused)
  const activeTimers = timers.filter(
    (timer) => timer.status === "running" || timer.status === "paused"
  );

  return (
    <TimerContext.Provider
      value={{
        timers,
        activeTimers,
        isLoading,
        createTimer,
        startTimer,
        pauseTimer,
        resumeTimer,
        cancelTimer,
        updateTimer,
        cancelAllTimers,
        getTimersForStep,
        refreshTimers,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
};
