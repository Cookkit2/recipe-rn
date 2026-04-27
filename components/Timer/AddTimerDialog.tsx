/**
 * Add Timer Dialog Component
 *
 * Dialog for creating new cooking timers with name and duration.
 * Provides input fields for timer name, hours, minutes, and seconds.
 */

import React, { useState } from "react";
import { View, TextInput, ActivityIndicator } from "react-native";
import { ClockIcon } from "lucide-uniwind";
import { toast } from "sonner-native";
import { Button } from "~/components/ui/button";
import { Text } from "~/components/ui/text";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { useTimer } from "~/store/TimerContext";
import { cn } from "~/lib/utils";

interface AddTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipeId?: string;
  stepNumber?: number;
}

export function AddTimerDialog({ open, onOpenChange, recipeId, stepNumber }: AddTimerDialogProps) {
  const { createTimer } = useTimer();
  const [timerName, setTimerName] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const isValidName = timerName.trim().length > 0;
  const hasValidDuration = hours !== "" || minutes !== "" || seconds !== "";

  const getTotalSeconds = (): number => {
    const h = parseInt(hours || "0", 10);
    const m = parseInt(minutes || "0", 10);
    const s = parseInt(seconds || "0", 10);
    return h * 3600 + m * 60 + s;
  };

  const handleSubmit = async () => {
    if (!isValidName) {
      toast.error("Please enter a timer name");
      return;
    }

    if (!hasValidDuration) {
      toast.error("Please enter a duration");
      return;
    }

    const totalSeconds = getTotalSeconds();
    if (totalSeconds <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }

    setIsCreating(true);
    try {
      await createTimer({
        name: timerName.trim(),
        durationSeconds: totalSeconds,
        recipeId,
        stepNumber,
      });

      toast.success("Timer created!");
      onOpenChange(false);
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create timer";
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setTimerName("");
    setHours("");
    setMinutes("");
    setSeconds("");
  };

  const handleDialogOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
    if (!isOpen) {
      resetForm();
    }
  };

  const formatTimeInput = (value: string, max: number): string => {
    // Remove non-numeric characters
    const cleaned = value.replace(/[^0-9]/g, "");
    // Ensure value is within valid range
    const num = parseInt(cleaned || "0", 10);
    if (num > max) return max.toString();
    return cleaned;
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Cooking Timer</DialogTitle>
          <DialogDescription>
            Set a timer for your cooking. You can name it and set the duration.
          </DialogDescription>
        </DialogHeader>

        <View className="gap-4">
          {/* Timer Name Input */}
          <View className="gap-2">
            <Label nativeID="timer-name">Timer Name</Label>
            <View className="flex-row items-center bg-muted rounded-xl px-4 py-3">
              <ClockIcon className="text-muted-foreground mr-2" size={18} />
              <TextInput
                className="flex-1 text-foreground"
                placeholder="e.g., Pasta, Sauce, Oven..."
                value={timerName}
                onChangeText={setTimerName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isCreating}
                accessibilityLabel="Timer name"
                accessibilityLabelledBy="timer-name"
              />
            </View>
          </View>

          {/* Duration Input */}
          <View className="gap-2">
            <Label nativeID="timer-duration">Duration</Label>
            <View className="flex-row items-center gap-2">
              {/* Hours */}
              <View className="flex-1">
                <Input
                  className="text-center"
                  placeholder="0"
                  value={hours}
                  onChangeText={(text) => setHours(formatTimeInput(text, 23))}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!isCreating}
                  accessibilityLabel="Hours"
                />
                <Text className="text-xs text-muted-foreground text-center mt-1">Hours</Text>
              </View>

              <Text className="text-foreground text-lg font-semibold">:</Text>

              {/* Minutes */}
              <View className="flex-1">
                <Input
                  className="text-center"
                  placeholder="00"
                  value={minutes}
                  onChangeText={(text) => setMinutes(formatTimeInput(text, 59))}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!isCreating}
                  accessibilityLabel="Minutes"
                />
                <Text className="text-xs text-muted-foreground text-center mt-1">Minutes</Text>
              </View>

              <Text className="text-foreground text-lg font-semibold">:</Text>

              {/* Seconds */}
              <View className="flex-1">
                <Input
                  className="text-center"
                  placeholder="00"
                  value={seconds}
                  onChangeText={(text) => setSeconds(formatTimeInput(text, 59))}
                  keyboardType="number-pad"
                  maxLength={2}
                  editable={!isCreating}
                  accessibilityLabel="Seconds"
                />
                <Text className="text-xs text-muted-foreground text-center mt-1">Seconds</Text>
              </View>
            </View>

            {/* Quick Duration Buttons */}
            <View className="flex-row flex-wrap gap-2 mt-2">
              {[
                { label: "5 min", seconds: 300 },
                { label: "10 min", seconds: 600 },
                { label: "15 min", seconds: 900 },
                { label: "30 min", seconds: 1800 },
                { label: "1 hour", seconds: 3600 },
              ].map(({ label, seconds: quickSeconds }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  onPress={() => {
                    const h = Math.floor(quickSeconds / 3600);
                    const m = Math.floor((quickSeconds % 3600) / 60);
                    const s = quickSeconds % 60;
                    setHours(h > 0 ? h.toString() : "");
                    setMinutes(m > 0 ? m.toString().padStart(2, "0") : "00");
                    setSeconds(s > 0 ? s.toString().padStart(2, "0") : "00");
                  }}
                  disabled={isCreating}
                  className="flex-1 min-w-[70px]"
                >
                  <Text className="text-xs">{label}</Text>
                </Button>
              ))}
            </View>
          </View>
        </View>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isCreating}>
              <Text>Cancel</Text>
            </Button>
          </DialogClose>
          <Button onPress={handleSubmit} disabled={isCreating || !isValidName || !hasValidDuration}>
            {isCreating ? <ActivityIndicator size="small" color="white" /> : <Text>Add Timer</Text>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddTimerDialog;
