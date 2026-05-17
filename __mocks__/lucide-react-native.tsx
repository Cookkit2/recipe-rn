import React from "react";
import { View } from "react-native";

export const ShoppingCart = React.forwardRef<any, any>(
  ({ size = 24, color = "#000000", strokeWidth = 2, ...props }, ref) => {
    return (
      <View
        ref={ref}
        testID="ShoppingCart"
        style={{
          width: size,
          height: size,
          backgroundColor: "transparent",
        }}
        {...props}
      />
    );
  }
);
