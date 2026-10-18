import { HStack, VStack, Text, Image, Spacer } from "@expo/ui/swift-ui";
import {
  font,
  foregroundStyle,
  padding,
  lineLimit,
  monospacedDigit,
  frame,
} from "@expo/ui/swift-ui/modifiers";
import { createLiveActivity, type LiveActivityEnvironment } from "expo-widgets";
import type { CookingActivityProps } from "./live-activity-controller";

function CookingTimerActivity(props: CookingActivityProps, environment: LiveActivityEnvironment) {
  "widget";
  const accent = environment.isLuminanceReduced ? "#FFFFFF" : "#F5AC55";
  const first = props.timers[0];
  const finished = props.completed || environment.isStale;
  const timer =
    first && !first.paused && !finished ? (
      <Text
        timerInterval={{ lower: new Date(0), upper: new Date(first.endsAt) }}
        countsDown
        modifiers={[
          font({ size: 16, weight: "semibold" }),
          monospacedDigit(),
          frame({ width: 72 }),
        ]}
      />
    ) : (
      <Text modifiers={[font({ weight: "semibold" }), monospacedDigit()]}>
        {finished
          ? "Done"
          : `${Math.floor((first?.remainingSeconds ?? 0) / 60)}:${String((first?.remainingSeconds ?? 0) % 60).padStart(2, "0")}`}
      </Text>
    );
  return {
    banner: (
      <VStack alignment="leading" spacing={8} modifiers={[padding({ all: 16 })]}>
        <HStack>
          <Image systemName="timer" color={accent} />
          <Text modifiers={[font({ size: 14, weight: "semibold" }), foregroundStyle(accent)]}>
            {finished ? "Timer finished" : "Cookkit timers"}
          </Text>
          <Spacer />
          <Text modifiers={[font({ size: 12 })]}>
            {props.totalCount > 1 ? `${props.totalCount} timers` : ""}
          </Text>
        </HStack>
        {props.timers.map((item) => (
          <HStack key={item.id} spacing={12}>
            <Text modifiers={[font({ size: 16 }), lineLimit(1)]}>{item.name}</Text>
            <Spacer />
            {item.paused ? (
              <Text modifiers={[monospacedDigit()]}>
                {`Paused · ${Math.floor(item.remainingSeconds / 60)}:${String(item.remainingSeconds % 60).padStart(2, "0")}`}
              </Text>
            ) : props.completed ? (
              <Text>Done</Text>
            ) : (
              <Text
                timerInterval={{ lower: new Date(0), upper: new Date(item.endsAt) }}
                countsDown
                modifiers={[
                  font({ size: 20, weight: "semibold" }),
                  monospacedDigit(),
                  frame({ width: 96 }),
                ]}
              />
            )}
          </HStack>
        ))}
        {props.totalCount > 3 && <Text>{`+${props.totalCount - 3} more in Cookkit`}</Text>}
      </VStack>
    ),
    compactLeading: <Image systemName={first?.paused ? "pause.fill" : "timer"} color={accent} />,
    compactTrailing: timer,
    minimal: <Image systemName={finished ? "checkmark" : "timer"} color={accent} />,
    expandedLeading: <Text modifiers={[foregroundStyle(accent)]}>Cookkit</Text>,
    expandedTrailing: timer,
    expandedBottom: <Text modifiers={[lineLimit(2)]}>{first?.name ?? "Timer finished"}</Text>,
  };
}

export default createLiveActivity("CookkitCookingTimers", CookingTimerActivity);
