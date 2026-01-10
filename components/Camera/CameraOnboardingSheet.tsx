import React, { useCallback, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Portal } from "@rn-primitives/portal";
import { useVideoPlayer, VideoView } from "expo-video";
import { Image } from "expo-image";
import { H1, H4, P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import useColors from "~/hooks/useColor";
import PoweredByAI from "../Shared/PoweredByAI";
import { CAMERA_ONBOARDING_COMPLETED_KEY } from "~/constants/storage-keys";
import useLocalStorageState from "~/hooks/useLocalStorageState";

// Assets
const tutorialVideo =
  "https://npeumniwtoipfvuqqqwl.supabase.co/storage/v1/object/public/frame/capture-tutorial.mp4";
const iphoneFrame =
  "https://npeumniwtoipfvuqqqwl.supabase.co/storage/v1/object/public/frame/apple-iphone13mini-blue-portrait.png";

// iPhone 13 mini aspect ratio (width:height = 64.2:131.5 ≈ 0.488)
const FRAME_ASPECT_RATIO = 9 / 19.5;
const FRAME_HEIGHT = 400;
const FRAME_WIDTH = FRAME_HEIGHT * FRAME_ASPECT_RATIO;

export default function CameraOnboardingSheet() {
  const [showOnboarding, setShowOnboarding] = useLocalStorageState(
    CAMERA_ONBOARDING_COMPLETED_KEY,
    { defaultValue: false }
  );
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { bottom } = useSafeAreaInsets();
  const colors = useColors();

  const player = useVideoPlayer(tutorialVideo, (player) => {
    player.loop = true;
    player.muted = true;
  });

  useEffect(() => {
    if (showOnboarding) {
      bottomSheetRef.current?.expand();
      player.play();
    } else {
      bottomSheetRef.current?.close();
      player.pause();
    }
  }, [showOnboarding, player]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        setShowOnboarding(false);
        player.pause();
      }
    },
    [player, setShowOnboarding]
  );

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    player.pause();
    bottomSheetRef.current?.close();
    setShowOnboarding(true);
  };

  return (
    <Portal name="camera-onboarding-sheet">
      <BottomSheet
        ref={bottomSheetRef}
        index={showOnboarding ? 0 : -1}
        snapPoints={["85%"]}
        onChange={handleSheetChanges}
        enablePanDownToClose
        backgroundStyle={[
          styles.sheetBackground,
          { backgroundColor: colors.card },
        ]}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView
          style={[styles.contentContainer, { paddingBottom: bottom }]}
        >
          <PoweredByAI />
          {/* Video with iPhone Frame */}
          <View className="items-center justify-center py-4">
            <View style={styles.frameContainer}>
              {/* Video inside the frame */}
              <VideoView
                player={player}
                style={styles.video}
                contentFit="cover"
                nativeControls={false}
              />
              {/* iPhone frame overlay */}
              <Image
                source={iphoneFrame}
                style={styles.frameImage}
                contentFit="contain"
              />
            </View>
          </View>

          {/* Content */}
          <View className="flex-1 justify-end">
            <H1 className="text-3xl font-bowlby-one text-center pt-4 tracking-wider">
              Snap it. Record it.
            </H1>
            <P className="font-urbanist-medium text-foreground/80 px-4 text-center text-xl mb-2">
              One ingredient at a time
            </P>

            <Button
              size="lg"
              variant="default"
              onPress={handleComplete}
              className="mt-6 rounded-2xl bg-foreground mx-6"
            >
              <H4 className="text-background font-urbanist font-semibold">
                Got It
              </H4>
            </Button>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleIndicator: {
    width: 40,
    height: 4,
  },
  contentContainer: {
    flex: 1,
  },
  frameContainer: {
    width: FRAME_WIDTH,
    height: FRAME_HEIGHT,
  },
  video: {
    position: "absolute",
    inset: "5%",
    borderRadius: 16,
  },
  frameImage: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.23 }],
  },
});
