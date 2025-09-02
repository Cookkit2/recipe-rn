import React from "react";
import { Button } from "../ui/button";
import { P } from "../ui/typography";
import { View } from "react-native";
import {
  ArrowUpRightIcon,
  type LucidePropsWithClassName,
} from "lucide-nativewind";

export default function ListButton({
  title,
  icon,
  onPress,
  external,
}: {
  title: string;
  icon?: (props: LucidePropsWithClassName) => React.ReactNode;
  onPress: () => void;
  external?: boolean;
}) {
  const Icon = icon as React.ComponentType<LucidePropsWithClassName>;

  return (
    <Button
      variant="ghost"
      className="flex flex-row justify-start items-center gap-6 px-6"
      size="lg"
      onPress={onPress}
      enableAnimation={false}
    >
      {icon && <Icon className="color-foreground" size={24} strokeWidth={2} />}
      <P className="text-lg font-urbanist-semibold">{title}</P>
      <View className="flex-1" />
      {external && <ArrowUpRightIcon size={18} strokeWidth={1.618} />}
    </Button>
  );
}
