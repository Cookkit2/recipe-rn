import React, { createContext, useCallback, useContext, useState } from "react";
import type { PantryItemConfirmation } from "~/types/PantryItem";
import type { YOLOResult } from "~/utils/yolo-segmentation";
import { useWindowDimensions } from "react-native";

interface CameraContextType {
  // UI State only
  photoSize: {
    width: number;
    height: number;
  } | null;
  updatePhotoSize: (photoSize: { width: number; height: number }) => void;
  yoloResults: YOLOResult | null;
  setYoloResults: (yoloResults: YOLOResult | null) => void;
  processPantryItems: PantryItemConfirmation[];
  addProcessPantryItems: (item: PantryItemConfirmation) => void;
  updateProcessPantryItems: (item: PantryItemConfirmation) => void;
  framePosition: { x: number; y: number };
  updateFramePosition: (framePosition: { x: number; y: number }) => void;
}

const CameraContext = createContext<CameraContextType | null>(null);

export function CameraProvider({ children }: { children: React.ReactNode }) {
  const [photoSize, setPhotoSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [yoloResults, setYoloResults] = useState<YOLOResult | null>(null);
  const [processPantryItems, setProcessPantryItems] = useState<
    PantryItemConfirmation[]
  >([
    // {
    //   id: "1",
    //   name: "Tomato",
    //   quantity: 1,
    //   unit: "pcs",
    //   image_url: require("~/assets/images/tomato.png"),
    // }
  ]);
  const { width, height } = useWindowDimensions();
  const [framePosition, setFramePosition] = useState({
    x: width / 2 - 48, // Center horizontally (minus half frame width: 96px / 2 = 48px)
    y: height / 2 - 48, // Center vertically (minus half frame height: 96px / 2 = 48px)
  });

  const updatePhotoSize = useCallback(
    (photoSize: { width: number; height: number }) => {
      setPhotoSize(photoSize);
    },
    []
  );

  const updateFramePosition = useCallback(
    (framePosition: { x: number; y: number }) => {
      setFramePosition(framePosition);
    },
    []
  );

  const addProcessPantryItems = useCallback((item: PantryItemConfirmation) => {
    setProcessPantryItems((prev) => [item, ...prev]);
  }, []);

  const updateProcessPantryItems = useCallback(
    (item: PantryItemConfirmation) => {
      setProcessPantryItems((prev) =>
        prev.map((i) => (i.id === item.id ? item : i))
      );
    },
    []
  );

  return (
    <CameraContext.Provider
      value={{
        photoSize,
        updatePhotoSize,
        yoloResults,
        setYoloResults,
        processPantryItems,
        addProcessPantryItems,
        updateProcessPantryItems,
        framePosition,
        updateFramePosition,
      }}
    >
      {children}
    </CameraContext.Provider>
  );
}

export const useCameraStore = () => {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error("useCameraStore must be used within a CameraProvider");
  }
  return context;
};
