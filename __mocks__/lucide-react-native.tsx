import React from "react";

// Avoid importing from react-native -- it can resolve to a worktree's
// unconfigured copy.  Use a plain host element instead.
export const ShoppingCart = React.forwardRef<any, any>(
  ({ size = 24, color = "#000000", strokeWidth = 2, ...props }, ref) => {
    return React.createElement("View", {
      ref,
      testID: "ShoppingCart",
      style: {
        width: size,
        height: size,
        backgroundColor: "transparent",
      },
      ...props,
    });
  }
);
