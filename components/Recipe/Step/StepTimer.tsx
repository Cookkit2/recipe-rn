import React, { useCallback, useMemo } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector, TouchableOpacity } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { runOnJS } from "react-native-reanimated";
import { PlusIcon } from "lucide-uniwind";
import TimerList from "~/components/Timer/TimerList";
import { Text } from "~/components/ui/text";
import { P } from "~/components/ui/typography";
import { useTimer } from "~/store/TimerContext";

interface StepTimerProps {
  onOpenAddTimerDialog: () => void;
}

export default function StepTimer({ onOpenAddTimerDialog }: StepTimerProps) {
  const { bottom } = useSafeAreaInsets();
  const { activeTimers, startTimer, pauseTimer, cancelTimer } = useTimer();

  const handleTogglePlay = useCallback(
    async (timerId: string) => {
      const timer = activeTimers.find((t) => t.id === timerId);
      if (!timer) return;

      if (timer.status === "running") {
        await pauseTimer(timerId);
      } else {
        await startTimer(timerId);
      }
    },
    [activeTimers, pauseTimer, startTimer]
  );

  const handleDeleteTimer = useCallback(
    async (timerId: string) => {
      await cancelTimer(timerId);
    },
    [cancelTimer]
  );

  const tapGesture = useMemo(
    () =>
      Gesture.Tap().onEnd(() => {
        "worklet";
        runOnJS(onOpenAddTimerDialog)();
      }),
    [onOpenAddTimerDialog]
  );

  return (
    <View
      className="bg-background border-t border-border/20"
      style={{ paddingTop: 12, paddingBottom: bottom + 8, zIndex: 1 }}
    >
      <View className="px-4 flex-row items-center justify-between mb-2">
        <P className="font-urbanist-semibold text-foreground/90 text-sm">Active Timers</P>
        <GestureDetector gesture={tapGesture}>
          <TouchableOpacity
            onPress={onOpenAddTimerDialog}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            className="h-8 px-3 rounded-full flex-row items-center border border-input bg-background"
          >
            <PlusIcon size={14} strokeWidth={2.5} className="text-foreground" />
            <Text className="text-xs ml-1">Add Timer</Text>
          </TouchableOpacity>
        </GestureDetector>
      </View>
      <View className="px-4" style={{ height: 120 }}>
        <TimerList
          compact={true}
          className="bg-transparent"
          timers={activeTimers}
          onTogglePlay={handleTogglePlay}
          onDelete={handleDeleteTimer}
        />
      </View>
    </View>
  );
}
