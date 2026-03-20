import { useCallback, useState } from "react";
import { View, Pressable, Linking, StyleSheet, ActivityIndicator } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { Portal } from "@rn-primitives/portal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ShoppingBagIcon } from "lucide-uniwind";
import type { GroceryItem } from "~/hooks/queries/useGroceryList";
import type { MalaysiaShopPricing } from "~/hooks/useMalaysiaShopPricing";
import type { ShopRetailerRow } from "~/data/supabase-api/ShopRetailerApi";
import { buildGoogleMapsSearchNearUrl } from "~/utils/retailer-outbound-urls";
import { P } from "~/components/ui/typography";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import useColors from "~/hooks/useColor";

export interface MalaysiaShopBannerProps {
  neededItems: GroceryItem[];
  pricing: MalaysiaShopPricing;
}

function destinationCopy(retailer: ShopRetailerRow): string {
  if (retailer.channel_type === "google_maps") {
    return `Google Maps — find ${retailer.display_name} near you`;
  }
  if (retailer.channel_type === "grab") {
    return `Grab — ${retailer.display_name}`;
  }
  return retailer.display_name;
}

async function openRetailerOutbound(
  retailer: ShopRetailerRow,
  latitude: number,
  longitude: number
): Promise<void> {
  if (retailer.channel_type === "google_maps") {
    const q = retailer.maps_search_query?.trim() || retailer.display_name;
    const url = buildGoogleMapsSearchNearUrl(q, latitude, longitude);
    await Linking.openURL(url);
    return;
  }

  const grabUrl =
    retailer.grab_open_url?.trim() ||
    process.env.EXPO_PUBLIC_GRAB_JAYA_GROCER_URL ||
    "https://food.grab.com/my/en";
  await Linking.openURL(grabUrl);
}

export default function MalaysiaShopBanner({ neededItems, pricing }: MalaysiaShopBannerProps) {
  const colors = useColors();
  const { bottom } = useSafeAreaInsets();
  const {
    eligibility,
    retailers,
    retailersLoading,
    selectedRetailer,
    pickRetailer,
    pricesLoading,
    priceRollup,
  } = pricing;

  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmOutbound = useCallback(async () => {
    if (!selectedRetailer || eligibility.latitude === undefined || eligibility.longitude === undefined) {
      return;
    }
    try {
      await openRetailerOutbound(selectedRetailer, eligibility.latitude, eligibility.longitude);
    } catch (e) {
      if (typeof __DEV__ !== "undefined" && __DEV__) {
        console.warn("[MalaysiaShopBanner] openURL failed:", e);
      }
    } finally {
      setConfirmOpen(false);
    }
  }, [selectedRetailer, eligibility.latitude, eligibility.longitude]);

  if (neededItems.length === 0) {
    return null;
  }

  if (eligibility.status === "loading") {
    return (
      <View className="mx-5 mb-4 flex-row items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <ActivityIndicator size="small" />
        <P className="text-muted-foreground text-sm">Checking Malaysia location for shop links…</P>
      </View>
    );
  }

  if (eligibility.status === "disabled") {
    return null;
  }

  if (eligibility.status === "denied" || eligibility.status === "unavailable") {
    return (
      <View className="mx-5 mb-4 rounded-xl border border-border bg-card px-4 py-3">
        <P className="text-muted-foreground text-sm">
          {eligibility.message ??
            "Allow location access to unlock Malaysia shop shortcuts (99 Speedmart & Jaya Grocer)."}
        </P>
        <Pressable
          className="mt-2 self-start"
          onPress={() => {
            eligibility.recheck();
          }}
        >
          <P className="text-sm font-urbanist-semibold text-primary">Try again</P>
        </Pressable>
      </View>
    );
  }

  if (eligibility.status === "outside") {
    return (
      <View className="mx-5 mb-4 rounded-xl border border-border bg-card px-4 py-3">
        <P className="text-muted-foreground text-sm">
          {eligibility.message ?? "Shop shortcuts are only available in Malaysia."}
        </P>
      </View>
    );
  }

  if (eligibility.status !== "eligible") {
    return null;
  }

  if (retailersLoading && retailers.length === 0) {
    return (
      <View className="mx-5 mb-4 flex-row items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <ActivityIndicator size="small" />
        <P className="text-muted-foreground text-sm">Loading Malaysia shops…</P>
      </View>
    );
  }

  if (!selectedRetailer) {
    return null;
  }

  return (
    <>
      <View className="mx-5 mb-4 rounded-xl border border-border bg-card px-4 py-3">
        <View className="mb-3 flex-row items-center gap-2">
          <ShoppingBagIcon size={20} className="text-foreground" strokeWidth={2} />
          <P className="font-urbanist-semibold text-base">Shop in Malaysia</P>
        </View>

        <View className="mb-3 flex-row gap-2">
          {retailersLoading
            ? null
            : retailers.map((r) => {
                const active = r.id === selectedRetailer.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => pickRetailer(r)}
                    className={`flex-1 rounded-lg border px-3 py-2 ${active ? "border-primary bg-primary/10" : "border-border bg-background"}`}
                  >
                    <P
                      className={`text-center text-sm font-urbanist-semibold ${active ? "text-primary" : "text-foreground"}`}
                    >
                      {r.display_name}
                    </P>
                  </Pressable>
                );
              })}
        </View>

        <Button
          variant="default"
          className="bg-foreground"
          onPress={() => setConfirmOpen(true)}
          disabled={retailersLoading || !selectedRetailer}
        >
          <P className="font-urbanist-semibold text-background">Go shopping</P>
        </Button>
      </View>

      {confirmOpen && selectedRetailer && eligibility.latitude !== undefined && eligibility.longitude !== undefined && (
        <Portal name="malaysia-shop-confirm">
          <BottomSheet
            index={0}
            snapPoints={["58%"]}
            enablePanDownToClose
            onChange={(index) => {
              if (index === -1) {
                setConfirmOpen(false);
              }
            }}
            backgroundStyle={[styles.sheetBackground, { backgroundColor: colors.card }]}
            handleIndicatorStyle={styles.handleIndicator}
          >
            <BottomSheetView style={[styles.sheetBody, { paddingBottom: bottom + 16 }]}>
              <P className="mb-1 px-6 font-urbanist-semibold text-lg text-foreground">
                You’re leaving Cookkit
              </P>
              <P className="mb-4 px-6 text-sm text-muted-foreground">{destinationCopy(selectedRetailer)}</P>

              <Separator className="mb-4" />

              <P className="mb-2 px-6 text-sm text-foreground">
                {neededItems.length} {neededItems.length === 1 ? "item" : "items"} to buy
              </P>

              <P className="mb-1 px-6 text-base font-urbanist-semibold text-foreground">
                Estimated total: RM {priceRollup.totalMyr.toFixed(2)}
              </P>
              <P className="mb-4 px-6 text-xs text-muted-foreground">
                {pricesLoading
                  ? "Loading price estimates…"
                  : priceRollup.unpricedLineCount > 0
                    ? `${priceRollup.unpricedLineCount} item(s) have no estimate — actual spend may be higher. `
                    : ""}
                Typical prices only; in-store or Grab totals may differ.
              </P>

              <View className="flex-row gap-3 px-6">
                <Button variant="outline" className="flex-1" onPress={() => setConfirmOpen(false)}>
                  <P className="font-urbanist-semibold">Cancel</P>
                </Button>
                <Button variant="default" className="flex-1 bg-foreground" onPress={handleConfirmOutbound}>
                  <P className="font-urbanist-semibold text-background">Continue</P>
                </Button>
              </View>
            </BottomSheetView>
          </BottomSheet>
        </Portal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  sheetBody: {
    flex: 1,
  },
});
