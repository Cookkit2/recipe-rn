import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetView,
} from "@expo/ui/community/bottom-sheet";
import { Portal } from "@rn-primitives/portal";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { H1, H4, P } from "~/components/ui/typography";
import useColors from "~/hooks/useColor";
import { log } from "~/utils/logger";

const TUTORIAL_VIDEO =
  "https://npeumniwtoipfvuqqqwl.supabase.co/storage/v1/object/public/frame/grab-mart-tutorial.mov";
const IPHONE_FRAME =
  "https://npeumniwtoipfvuqqqwl.supabase.co/storage/v1/object/public/frame/apple-iphone13mini-blue-portrait.png";

export default function GrabMartShoppingGuide({
  list,
  busy,
  onContinue,
  onClose,
}: {
  list: string;
  busy: boolean;
  onContinue: () => void;
  onClose: () => void;
}) {
  const { bottom } = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const colors = useColors();
  const frameHeight = Math.min(400, height * 0.45);
  const player = useVideoPlayer(TUTORIAL_VIDEO, (player) => {
    player.loop = true;
    player.muted = true;
  });

  useEffect(() => {
    try {
      if (busy) player.pause();
      else player.play();
    } catch (error) {
      log.warn("Couldn't play GrabMart tutorial:", error);
    }
    return () => {
      try {
        player.pause();
      } catch {
        // The native player may already have been released on unmount.
      }
    };
  }, [busy, player]);

  return (
    <Portal name="grabmart-shopping-guide">
      <BottomSheet
        index={0}
        snapPoints={["85%"]}
        enablePanDownToClose={!busy}
        onChange={(index) => {
          if (index === -1 && !busy) onClose();
        }}
        backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.card }]}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <BottomSheetView style={styles.content}>
          <BottomSheetScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View className="items-center justify-center py-4">
              <View style={{ width: frameHeight * (9 / 19.5), height: frameHeight }}>
                <VideoView
                  player={player}
                  style={styles.video}
                  contentFit="contain"
                  nativeControls={false}
                  surfaceType="textureView"
                  accessibilityLabel="How to paste your shopping list in GrabMart"
                />
                <Image
                  source={IPHONE_FRAME}
                  style={styles.frameImage}
                  contentFit="contain"
                  pointerEvents="none"
                />
              </View>
            </View>
            <H1 className="pt-4 text-center font-bowlby-one text-3xl">Shop on GrabMart</H1>
            <P className="mt-2 px-6 text-center font-urbanist-medium text-muted-foreground">
              We’ll copy your list. Paste it into GrabMart’s Shopping list.
            </P>
            {list.length > 1000 && (
              <P className="mx-6 mt-4 text-center font-urbanist-regular text-sm text-muted-foreground">
                Grab’s field holds 1,000 characters. Paste this list in smaller batches.
              </P>
            )}
          </BottomSheetScrollView>
          <View className="px-6 pt-4" style={{ paddingBottom: Math.max(bottom, 16) }}>
            <Button
              size="lg"
              className="rounded-2xl bg-foreground"
              disabled={busy}
              isLoading={busy}
              onPress={onContinue}
              accessibilityHint="Copies your grocery list, then opens GrabMart after two seconds"
            >
              <H4 className="font-urbanist-semibold text-background">Continue</H4>
            </Button>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </Portal>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handleIndicator: { width: 40, height: 4 },
  content: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 8 },
  video: { position: "absolute", inset: "5%", borderRadius: 16 },
  frameImage: {
    position: "absolute",
    width: "100%",
    height: "100%",
    transform: [{ scale: 1.23 }],
  },
});
