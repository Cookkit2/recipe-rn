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
import { log } from "~/utils/logger";

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
  const [isOnboardingComplete, setIsOnboardingComplete] = useLocalStorageState(
    CAMERA_ONBOARDING_COMPLETED_KEY,
    {
      defaultValue: false,
    }
  );
  const [isLoaded, setIsLoaded] = React.useState(false);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const { bottom } = useSafeAreaInsets();
  const colors = useColors();

  const player = useVideoPlayer(tutorialVideo, (player) => {
    player.loop = true;
    player.muted = true;
  });

  // Wait for storage to load before showing the sheet
  useEffect(() => {
    // Small delay to ensure storage has loaded
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isOnboardingComplete) {
      bottomSheetRef.current?.expand();
      try {
        player?.play();
      } catch (error) {
        log.warn("Failed to play video:", error);
      }
    } else {
      bottomSheetRef.current?.close();
      try {
        player?.pause();
      } catch (error) {
        log.warn("Failed to pause video:", error);
      }
    }

    return () => {
      try {
        player?.pause();
      } catch (error) {
        // Silent cleanup - player may already be disposed
      }
    };
  }, [isOnboardingComplete, player, isLoaded]);

  const handleSheetChanges = useCallback(
    (index: number) => {
      if (index === -1) {
        setIsOnboardingComplete(true);
        try {
          player?.pause();
        } catch (error) {
          log.warn("Failed to pause video on sheet close:", error);
        }
      }
    },
    [player, setIsOnboardingComplete]
  );

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      player?.pause();
    } catch (error) {
      log.warn("Failed to pause video on complete:", error);
    }
    bottomSheetRef.current?.close();
    setIsOnboardingComplete(true);
  };

  // Don't render until storage has loaded
  if (!isLoaded) {
    return null;
  }

  return (
    <Portal name="camera-onboarding-sheet">
      <BottomSheet
        ref={bottomSheetRef}
        index={isOnboardingComplete ? -1 : 0}
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
