import React from "react";
import { useCreateIngredientStore } from "~/store/CreateIngredientContext";
import ScanFrame from "./ScanFrame";

export default function FocusingAreaIndicator() {
  const { framePosition } = useCreateIngredientStore();

  return (
    <>
      {/* Scanning Frame Overlay - positioned based on touch */}
      <ScanFrame x={framePosition.x + 48} y={framePosition.y + 48} />
    </>
  );
}
