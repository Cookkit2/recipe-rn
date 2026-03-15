import React from "react";
import { View } from "react-native";
import { P } from "~/components/ui/typography";

type ListItemProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

const ListItem = ({ icon, title, description }: ListItemProps) => {
  return (
    <View className="flex-row gap-6">
      {icon}
      <View className="flex-1">
        <P className="text-foreground font-urbanist-semibold">{title}</P>
        <P className="text-muted-foreground font-urbanist-regular tracking-wide">{description}</P>
      </View>
    </View>
  );
};

export default ListItem;
