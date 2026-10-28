import type { ReactNode } from "react";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { H1 } from "~/components/ui/typography";
import type { usePantryPullSearch } from "~/hooks/usePantryPullSearch";
import PantryHeaderActions from "./PantryHeaderActions";

type PullSearch = ReturnType<typeof usePantryPullSearch>;

function HeaderFade({
  pullSearch,
  children,
  testID,
}: {
  pullSearch: PullSearch;
  children: ReactNode;
  testID: string;
}) {
  const { progress } = pullSearch;
  const style = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));
  return (
    <Animated.View
      testID={testID}
      style={style}
      pointerEvents={pullSearch.phase === "closed" ? "auto" : "none"}
      accessibilityElementsHidden={pullSearch.phase !== "closed"}
    >
      {children}
    </Animated.View>
  );
}

export default function PantryHeader({ pullSearch }: { pullSearch: PullSearch }) {
  const router = useRouter();
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View hidesSharedBackground>
          <HeaderFade pullSearch={pullSearch} testID="pantry-header-title">
            <H1 className="font-bowlby-one pt-5 pb-2 pl-2">Pantry</H1>
          </HeaderFade>
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View hidesSharedBackground>
          <HeaderFade pullSearch={pullSearch} testID="pantry-header-actions">
            <PantryHeaderActions
              disabled={pullSearch.phase !== "closed"}
              onSearch={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                pullSearch.open();
              }}
              onAskCookkit={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({ pathname: "/search", params: { mode: "chat" } });
              }}
              onAdd={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/ingredient/create");
              }}
              onProfile={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push("/profile");
              }}
            />
          </HeaderFade>
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    </>
  );
}
