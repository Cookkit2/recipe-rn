import { useId, useState } from "react";
import { PortalHost } from "@rn-primitives/portal";
import { ScrollView, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { XIcon } from "lucide-uniwind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { H3, P } from "~/components/ui/typography";
import { Text } from "~/components/ui/text";
import AddTimerDialog from "~/components/Timer/AddTimerDialog";
import { useTimer } from "~/store/TimerContext";
import { formatTimerDuration } from "~/utils/timer-service";

export default function CookingTimersScreen() {
  const { bottom } = useSafeAreaInsets();
  const router = useRouter();
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();
  const { timers, isLoading, startTimer, pauseTimer, resumeTimer, cancelTimer } = useTimer();
  const [adding, setAdding] = useState(false);
  const portalHost = useId();
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          title: "Cooking timers",
          headerShown: true,
          headerBackButtonDisplayMode: "minimal",
          headerRight: () => (
            <Button
              variant="ghost"
              size="icon"
              accessibilityLabel="Close timers"
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
            >
              <XIcon className="text-foreground" size={20} />
            </Button>
          ),
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 24, paddingBottom: bottom + 24, gap: 16 }}
      >
        {timers.length === 0 && (
          <P className="text-muted-foreground">Your cooking timers will appear here.</P>
        )}
        {timers.map((timer) => (
          <View key={timer.id} className="rounded-3xl bg-muted p-5 gap-3">
            <H3>{timer.name}</H3>
            <P className="text-3xl font-urbanist-semibold" accessibilityLiveRegion="none">
              {formatTimerDuration(timer.remainingSeconds)}
            </P>
            <View className="flex-row gap-3">
              {timer.status !== "completed" && (
                <Button
                  variant="secondary"
                  accessibilityLabel={`${timer.status === "running" ? "Pause" : timer.status === "paused" ? "Resume" : "Start"} ${timer.name}`}
                  onPress={() =>
                    void (timer.status === "running"
                      ? pauseTimer(timer.id)
                      : timer.status === "paused"
                        ? resumeTimer(timer.id)
                        : startTimer(timer.id))
                  }
                >
                  <Text>
                    {timer.status === "running"
                      ? "Pause"
                      : timer.status === "paused"
                        ? "Resume"
                        : "Start"}
                  </Text>
                </Button>
              )}
              <Button
                variant="ghost"
                onPress={() => void cancelTimer(timer.id)}
                accessibilityLabel={`Remove ${timer.name}`}
              >
                <Text>{timer.status === "completed" ? "Dismiss" : "Cancel"}</Text>
              </Button>
            </View>
          </View>
        ))}
        <Button disabled={isLoading} onPress={() => setAdding(true)}>
          <Text>Add timer</Text>
        </Button>
      </ScrollView>
      <AddTimerDialog
        open={adding}
        onOpenChange={setAdding}
        recipeId={recipeId}
        portalHost={portalHost}
      />
      <PortalHost name={portalHost} />
    </View>
  );
}
