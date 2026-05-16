import React from "react";
import { render } from "@testing-library/react-native";
import FocusingAreaIndicator from "../FocusingAreaIndicator";

// Mock the ScanFrame component
jest.mock("../ScanFrame", () => {
  const { View } = require("react-native");
  return ({ x, y }: { x: number; y: number }) => (
    <View testID="scan-frame-mock" accessibilityState={{ x, y } as any} />
  );
});

// Mock the store hook
jest.mock("~/store/CreateIngredientContext", () => ({
  useCreateIngredientStore: jest.fn(),
}));

import { useCreateIngredientStore } from "~/store/CreateIngredientContext";

describe("FocusingAreaIndicator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders ScanFrame with correctly calculated coordinates", () => {
    // Setup mock hook return value
    (useCreateIngredientStore as jest.Mock).mockReturnValue({
      framePosition: { x: 100, y: 200 },
    });

    const { getByTestId } = render(<FocusingAreaIndicator />);

    // Verify ScanFrame is rendered
    const scanFrame = getByTestId("scan-frame-mock");
    expect(scanFrame).toBeTruthy();

    // ScanFrame x/y props are calculated as:
    // x: framePosition.x + 48
    // y: framePosition.y + 48
    expect(scanFrame.props.accessibilityState).toEqual({
      x: 148, // 100 + 48
      y: 248, // 200 + 48
    });
  });

  it("handles zero coordinates correctly", () => {
    (useCreateIngredientStore as jest.Mock).mockReturnValue({
      framePosition: { x: 0, y: 0 },
    });

    const { getByTestId } = render(<FocusingAreaIndicator />);

    const scanFrame = getByTestId("scan-frame-mock");
    expect(scanFrame.props.accessibilityState).toEqual({
      x: 48,
      y: 48,
    });
  });

  it("handles negative coordinates correctly", () => {
    (useCreateIngredientStore as jest.Mock).mockReturnValue({
      framePosition: { x: -20, y: -30 },
    });

    const { getByTestId } = render(<FocusingAreaIndicator />);

    const scanFrame = getByTestId("scan-frame-mock");
    expect(scanFrame.props.accessibilityState).toEqual({
      x: 28, // -20 + 48
      y: 18, // -30 + 48
    });
  });
});
