import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, fireEvent } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";
import IngredientHeaderRow from "../IngredientHeaderRow";

// Mocks
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "Light" },
}));

jest.mock("~/store/CreateIngredientContext", () => ({
  useCreateIngredientStore: jest.fn(),
}));

jest.mock("../../Ingredient/IngredientThumbnail", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ item }: any) => <View testID={`ingredient-thumbnail-${item.id}`} />,
  };
});

// Mock hooks/animation/useButtonAnimations which uses Easing from reanimated
jest.mock("~/hooks/animation/useButtonAnimations", () => ({
  __esModule: true,
  default: () => ({
    animatedStyle: {},
    roundedStyle: {},
    onPressIn: jest.fn(),
    onPressOut: jest.fn(),
  }),
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View, FlatList, Pressable } = require("react-native");

  const AnimatedFlatList = React.forwardRef((props: any, ref: any) => {
    return <FlatList {...props} ref={ref} />;
  });

  return {
    __esModule: true,
    default: {
      View: View,
      FlatList: AnimatedFlatList,
      createAnimatedComponent: (Component: any) =>
        React.forwardRef((props: any, ref: any) => <Component {...props} ref={ref} />),
    },
    Easing: {
      bezier: jest.fn(),
    },
    ReduceMotion: {
      System: "System",
    },
    LinearTransition: {
      springify: () => ({
        damping: () => ({
          mass: () => ({
            stiffness: () => ({
              overshootClamping: () => ({}),
            }),
          }),
        }),
      }),
    },
  };
});

// Spy on Alert
Alert.alert = jest.fn() as any;

describe("IngredientHeaderRow", () => {
  const mockRouter = {
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(),
  };

  const { useRouter } = require("expo-router");
  const { useCreateIngredientStore } = require("~/store/CreateIngredientContext");
  const { impactAsync, ImpactFeedbackStyle } = require("expo-haptics");

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it("should render correctly with empty processPantryItems", () => {
    (useCreateIngredientStore as jest.Mock).mockReturnValue({ processPantryItems: [] });

    const { getByText, getByLabelText } = render(<IngredientHeaderRow />);

    expect(getByText("Logged ingredients will appear here")).toBeTruthy();
    expect(getByLabelText("Close camera")).toBeTruthy();
  });

  it("should render correctly with populated processPantryItems", () => {
    const items = [
      { id: "1", name: "Apple" },
      { id: "2", name: "Banana" },
    ];
    (useCreateIngredientStore as jest.Mock).mockReturnValue({ processPantryItems: items });

    const { queryByText, getByTestId, getByLabelText } = render(<IngredientHeaderRow />);

    expect(queryByText("Logged ingredients will appear here")).toBeNull();
    expect(getByTestId("ingredient-thumbnail-1")).toBeTruthy();
    expect(getByTestId("ingredient-thumbnail-2")).toBeTruthy();
    expect(getByLabelText("Close camera")).toBeTruthy();
  });

  it("should call onConfirm and navigate to confirmation page when an item is pressed", () => {
    const items = [{ id: "1", name: "Apple" }];
    (useCreateIngredientStore as jest.Mock).mockReturnValue({ processPantryItems: items });

    const { getByTestId } = render(<IngredientHeaderRow />);

    // Press the Pressable wrapping the thumbnail
    fireEvent.press(getByTestId("ingredient-thumbnail-1"));

    expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
    expect(mockRouter.push).toHaveBeenCalledWith("/ingredient/confirmation");
  });

  describe("onBack handler", () => {
    it("should go back directly when processPantryItems is empty and canGoBack is true", () => {
      (useCreateIngredientStore as jest.Mock).mockReturnValue({ processPantryItems: [] });
      mockRouter.canGoBack.mockReturnValue(true);

      const { getByLabelText } = render(<IngredientHeaderRow />);
      fireEvent.press(getByLabelText("Close camera"));

      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(mockRouter.back).toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    it("should replace to '/' when processPantryItems is empty and canGoBack is false", () => {
      (useCreateIngredientStore as jest.Mock).mockReturnValue({ processPantryItems: [] });
      mockRouter.canGoBack.mockReturnValue(false);

      const { getByLabelText } = render(<IngredientHeaderRow />);
      fireEvent.press(getByLabelText("Close camera"));

      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
      expect(Alert.alert).not.toHaveBeenCalled();
      expect(mockRouter.back).not.toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith("/");
    });

    it("should show discard alert when processPantryItems is populated", () => {
      const items = [{ id: "1", name: "Apple" }];
      (useCreateIngredientStore as jest.Mock).mockReturnValue({ processPantryItems: items });

      const { getByLabelText } = render(<IngredientHeaderRow />);
      fireEvent.press(getByLabelText("Close camera"));

      expect(impactAsync).toHaveBeenCalledWith(ImpactFeedbackStyle.Light);
      expect(Alert.alert).toHaveBeenCalledWith(
        "Discard Items?",
        "Are you sure you want to go back? Your captured images won't be saved.",
        expect.arrayContaining([
          expect.objectContaining({ text: "Cancel", style: "cancel" }),
          expect.objectContaining({ text: "Discard", style: "destructive" }),
        ])
      );
      expect(mockRouter.back).not.toHaveBeenCalled();
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    describe("Discard alert action", () => {
      it("should go back when 'Discard' is pressed and canGoBack is true", () => {
        const items = [{ id: "1", name: "Apple" }];
        (useCreateIngredientStore as jest.Mock).mockReturnValue({ processPantryItems: items });
        mockRouter.canGoBack.mockReturnValue(true);

        const { getByLabelText } = render(<IngredientHeaderRow />);
        fireEvent.press(getByLabelText("Close camera"));

        // Simulate pressing 'Discard'
        const alertMock = Alert.alert as jest.Mock;
        const alertCalls = alertMock.mock.calls as Array<Array<any>>;
        if (alertCalls && alertCalls.length > 0) {
          const firstCall = alertCalls[0];
          if (firstCall && firstCall.length > 2) {
            const buttons = firstCall[2] as any[];
            if (buttons) {
              const discardAction = buttons.find((button: any) => button.text === "Discard");
              if (discardAction && typeof discardAction.onPress === "function") {
                discardAction.onPress();
              }
            }
          }
        }

        expect(mockRouter.back).toHaveBeenCalled();
        expect(mockRouter.replace).not.toHaveBeenCalled();
      });

      it("should replace to '/' when 'Discard' is pressed and canGoBack is false", () => {
        const items = [{ id: "1", name: "Apple" }];
        (useCreateIngredientStore as jest.Mock).mockReturnValue({ processPantryItems: items });
        mockRouter.canGoBack.mockReturnValue(false);

        const { getByLabelText } = render(<IngredientHeaderRow />);
        fireEvent.press(getByLabelText("Close camera"));

        // Simulate pressing 'Discard'
        const alertMock = Alert.alert as jest.Mock;
        const alertCalls = alertMock.mock.calls as Array<Array<any>>;
        if (alertCalls && alertCalls.length > 0) {
          const firstCall = alertCalls[0];
          if (firstCall && firstCall.length > 2) {
            const buttons = firstCall[2] as any[];
            if (buttons) {
              const discardAction = buttons.find((button: any) => button.text === "Discard");
              if (discardAction && typeof discardAction.onPress === "function") {
                discardAction.onPress();
              }
            }
          }
        }

        expect(mockRouter.back).not.toHaveBeenCalled();
        expect(mockRouter.replace).toHaveBeenCalledWith("/");
      });
    });
  });
});
