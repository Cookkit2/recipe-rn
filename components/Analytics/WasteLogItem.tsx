import React from "react";
import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import Animated from "react-native-reanimated";
import useButtonAnimation from "~/hooks/animation/useButtonAnimations";
import { Trash2Icon, AlertTriangleIcon, PackageIcon, ZapIcon } from "lucide-uniwind";
import { H4, P } from "~/components/ui/typography";
import type WasteLog from "~/data/db/models/WasteLog";

type WasteLogItemProps = {
  wasteLog: WasteLog;
  onPress?: () => void;
};

const WasteLogItem = ({ wasteLog, onPress }: WasteLogItemProps) => {
  const { animatedStyle, onPressIn, onPressOut } = useButtonAnimation(!!onPress, 16);

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  // Get icon based on waste reason
  const getWasteIcon = () => {
    const reason = wasteLog.reason?.toLowerCase();
    switch (reason) {
      case "expired":
        return <AlertTriangleIcon size={20} className="text-amber-500" />;
      case "spoiled":
        return <ZapIcon size={20} className="text-orange-500" />;
      case "excess":
        return <PackageIcon size={20} className="text-blue-500" />;
      case "accidental":
        return <AlertTriangleIcon size={20} className="text-red-500" />;
      default:
        return <Trash2Icon size={20} className="text-muted-foreground" />;
    }
  };

  // Get display text for reason
  const getReasonText = () => {
    if (!wasteLog.reason) return null;
    return wasteLog.reason.charAt(0).toUpperCase() + wasteLog.reason.slice(1);
  };

  // Format quantity with unit
  const formatQuantity = () => {
    const unit = wasteLog.stock?.unit;
    return `${wasteLog.quantityWasted} ${unit || ""}`;
  };

  const content = (
    <Animated.View className="flex-column items-start p-3" style={[animatedStyle]}>
      <Pressable onPress={handlePress} onPressIn={onPressIn} onPressOut={onPressOut}>
        <View className="flex-row items-center gap-3">
          {/* Icon or thumbnail */}
          {wasteLog.stock?.imageUrl ? (
            <View className="w-12 h-12 rounded-2xl overflow-hidden bg-muted/30">
              <Image
                source={{ uri: wasteLog.stock.imageUrl }}
                style={styles.thumbnail}
                contentFit="cover"
              />
            </View>
          ) : (
            <View className="w-12 h-12 rounded-2xl bg-muted/30 items-center justify-center">
              {getWasteIcon()}
            </View>
          )}

          {/* Content */}
          <View className="flex-1 gap-1">
            <H4 className="text-foreground font-urbanist-semibold">
              {wasteLog.stock?.name || "Unknown Item"}
            </H4>
            <View className="flex-row items-center gap-2">
              <P className="text-muted-foreground font-urbanist-regular text-sm">
                {formatQuantity()} • {wasteLog.formattedWasteDate}
              </P>
            </View>

            {/* Additional details */}
            <View className="flex-row items-center gap-2 mt-0.5">
              {wasteLog.hasReason && (
                <View className="bg-muted/50 px-2 py-0.5 rounded-full">
                  <P className="text-xs font-urbanist-medium text-foreground/70">
                    {getReasonText()}
                  </P>
                </View>
              )}
              {wasteLog.hasEstimatedCost && (
                <View className="bg-destructive/10 px-2 py-0.5 rounded-full">
                  <P className="text-xs font-urbanist-medium text-destructive">
                    {wasteLog.formattedCost}
                  </P>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );

  return content;
};

export default WasteLogItem;

const styles = StyleSheet.create({
  thumbnail: {
    width: "100%",
    height: "100%",
  },
});
