/**
 * Timer List Component
 *
 * Displays a scrollable list of active cooking timers.
 * Handles empty state and provides callbacks for timer controls.
 */

import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TimerItem } from "./TimerItem";
import { timerService } from "~/utils/timer-service";
import type { Timer } from "~/types/Timer";
import { P } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

interface TimerListProps {
  /**
   * Optional timer list to display (if not provided, uses timer service)
   */
  timers?: Timer[];
  /**
   * Callback when toggle play is pressed
   */
  onTogglePlay?: (timerId: string) => void;
  /**
   * Callback when delete is pressed
   */
  onDelete?: (timerId: string) => void;
  /**
   * Additional class name for styling
   */
  className?: string;
  /**
   * Whether to show the list in a compact mode (for smaller screens)
   */
  compact?: boolean;
}

export function TimerList({
  timers: externalTimers,
  onTogglePlay: externalOnTogglePlay,
  onDelete: externalOnDelete,
  className,
  compact = false,
}: TimerListProps) {
  const { bottom } = useSafeAreaInsets();
  const [timers, setTimers] = useState<Timer[]>(externalTimers ?? []);
  const [isLoading, setIsLoading] = useState(true);

  // Use internal timer service if no external timers provided
  const useInternalService = externalTimers === undefined;

  useEffect(() => {
    if (!useInternalService) {
      setTimers(externalTimers ?? []);
      setIsLoading(false);
      return;
    }

    // Initialize timer service and subscribe to updates
    let mounted = true;

    const loadTimers = async () => {
      try {
        await timerService.initialize();
        if (mounted) {
          setTimers(timerService.getAllTimers());
          setIsLoading(false);
        }
      } catch (error) {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadTimers();

    // Subscribe to timer updates
    const unsubscribe = timerService.onTimerUpdate((updatedTimers) => {
      if (mounted) {
        setTimers(updatedTimers);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [useInternalService, externalTimers]);

  const handleTogglePlay = useCallback(
    async (timerId: string) => {
      if (externalOnTogglePlay) {
        externalOnTogglePlay(timerId);
      } else if (useInternalService) {
        const timer = timers.find((t) => t.id === timerId);
        if (timer) {
          try {
            if (timer.status === "running") {
              await timerService.pauseTimer(timerId);
            } else {
              await timerService.startTimer(timerId);
            }
          } catch (error) {
            console.error("Failed to toggle timer", { timerId, error });
          }
        }
      }
    },
    [externalOnTogglePlay, useInternalService, timers]
  );

  const handleDelete = useCallback(
    async (timerId: string) => {
      if (externalOnDelete) {
        externalOnDelete(timerId);
      } else if (useInternalService) {
        try {
          await timerService.cancelTimer(timerId);
        } catch (error) {
          console.error("Failed to cancel timer", error);
        }
      }
    },
    [externalOnDelete, useInternalService]
  );

  // Loading state
  if (isLoading && useInternalService) {
    return (
      <View className={cn("items-center justify-center py-12", className)}>
        <ActivityIndicator size="small" />
        <P className="text-muted-foreground text-center font-urbanist-regular text-sm mt-2">
          Loading timers...
        </P>
      </View>
    );
  }

  // Empty state
  if (timers.length === 0) {
    return (
      <View className={cn("items-center justify-center py-8", className)}>
        <P className="text-muted-foreground text-center font-urbanist-regular text-sm">
          No active timers
        </P>
        <P className="text-muted-foreground text-center font-urbanist-regular text-xs mt-1">
          Tap + to add a cooking timer
        </P>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: compact ? bottom : bottom + 16,
        gap: 12,
      }}
      className={className}
    >
      {timers.map((timer) => (
        <TimerItem
          key={timer.id}
          timer={timer}
          onTogglePlay={handleTogglePlay}
          onDelete={handleDelete}
        />
      ))}
    </ScrollView>
  );
}

export default TimerList;
