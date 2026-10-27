import { Modal, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "~/components/ui/button";
import { H3, H4, P } from "~/components/ui/typography";

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
  return (
    <Modal
      visible
      animationType="slide"
      presentationStyle="pageSheet"
      allowSwipeDismissal={!busy}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-background">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <View className="px-6 pt-10 pb-4">
            <H3 className="font-urbanist-bold">Paste your list in GrabMart</H3>
            <P className="mt-2 font-urbanist-regular text-muted-foreground">
              Continue to copy your ingredients and quantities, then open Grab.
            </P>
          </View>
          <View className="mx-6 rounded-3xl bg-muted/50 p-6 gap-5">
            <P className="font-urbanist-medium">1. Open GrabMart, then tap Shopping list.</P>
            <P className="font-urbanist-medium">
              2. Press and hold in “Type or paste your list here”.
            </P>
            <P className="font-urbanist-medium">3. Tap Paste to add your list.</P>
          </View>
          <View className="mx-6 mt-6 rounded-2xl border border-border p-4">
            <P className="mb-2 font-urbanist-semibold text-muted-foreground">Your list</P>
            <P className="font-urbanist-regular" numberOfLines={5}>
              {list}
            </P>
          </View>
          {list.length > 1000 && (
            <P className="mx-6 mt-4 font-urbanist-regular text-sm text-muted-foreground">
              Grab’s field holds 1,000 characters. Paste this list in smaller batches.
            </P>
          )}
        </ScrollView>
        <View
          className="border-t border-border px-6 pt-4 gap-2 bg-background"
          style={{ paddingBottom: Math.max(bottom, 16) }}
        >
          <Button
            size="lg"
            variant="secondary"
            className="rounded-full bg-foreground"
            disabled={busy}
            isLoading={busy}
            onPress={onContinue}
            accessibilityHint="Copies your grocery list and opens GrabMart"
          >
            <H4 className="font-urbanist-semibold text-background">Continue</H4>
          </Button>
          <Button variant="ghost" disabled={busy} onPress={onClose}>
            <P className="font-urbanist-semibold text-muted-foreground">Not now</P>
          </Button>
        </View>
      </View>
    </Modal>
  );
}
