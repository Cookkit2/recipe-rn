import { fireEvent, render } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { SwipeableProps } from "react-native-gesture-handler/ReanimatedSwipeable";
import type { GroceryItem } from "~/hooks/queries/useGroceryList";
import GroceryListItem from "../GroceryListItem";
import { toast } from "sonner-native";

const mockToggle = jest.fn();
const mockDelete = jest.fn();
const mockRestore = jest.fn();
let mockSwipeableProps: SwipeableProps;

jest.mock("~/hooks/queries/useMealPlanQueries", () => ({
  useToggleGroceryItemCheck: () => ({ mutate: mockToggle }),
  useDeleteGroceryItem: () => ({ mutate: mockDelete }),
  useRestoreGroceryItem: () => ({ mutate: mockRestore }),
}));
jest.mock("sonner-native", () => ({ toast: jest.fn() }));
jest.mock("~/components/ui/typography", () => ({ P: require("react-native").Text }));
jest.mock("lucide-uniwind", () => {
  const { View } = require("react-native");
  return Object.fromEntries(
    [
      "CheckIcon",
      "SquareIcon",
      "CheckSquareIcon",
      "CircleIcon",
      "CheckCircleIcon",
      "TrashIcon",
    ].map((name) => [name, (props: object) => <View {...props} testID={name} />])
  );
});
jest.mock("react-native-reanimated", () => {
  const Native = require("react-native");
  return {
    __esModule: true,
    default: {
      View: Native.View,
      Text: Native.Text,
      createAnimatedComponent: (component: unknown) => component,
    },
    useAnimatedStyle: (read: () => object) => read(),
    withTiming: (value: number) => value,
  };
});
jest.mock("react-native-gesture-handler/ReanimatedSwipeable", () => {
  const { View } = require("react-native");
  // Match Swipeable's layering: actions remain mounted underneath the moving row,
  // including when the swipe is closed. Native gestures/translation are not simulated.
  return (props: SwipeableProps) => {
    mockSwipeableProps = props;
    return (
      <View testID="swipe-container" style={props.containerStyle}>
        {props.renderRightActions?.({ value: 0 } as any, { value: 0 } as any, {} as any)}
        <View testID="swipe-face" style={props.childrenContainerStyle}>
          {props.children}
        </View>
      </View>
    );
  };
});

const item: GroceryItem = {
  name: "Cooking Oil",
  normalizedName: "cooking oil",
  totalQuantity: 10,
  unit: "ml",
  neededQuantity: 10,
  pantryQuantity: 0,
  fromRecipes: ["Scrambled Eggs"],
  category: "pantry",
  isChecked: false,
  isCovered: false,
};

beforeEach(() => jest.clearAllMocks());

it.each([
  { isChecked: false, isCovered: false },
  { isChecked: true, isCovered: false },
  { isChecked: false, isCovered: true },
])(
  "keeps the swipe face opaque for %o so the delete action cannot bleed through",
  async (state) => {
    const screen = await render(<GroceryListItem item={{ ...item, ...state }} />);
    const row = screen.getByRole("checkbox");
    expect(row.props.className).toContain("bg-background");

    // Any opacity on the face or its ancestors makes the always-mounted delete
    // layer show through. Check that path rather than a particular wrapper shape.
    let node = row;
    while (node !== screen.getByTestId("swipe-container")) {
      expect(StyleSheet.flatten(node.props.style)?.opacity ?? 1).toBe(1);
      node = node.parent!;
    }
  }
);

it("clips the delete layer to one shared rounded frame, outside the inter-row spacing", async () => {
  const screen = await render(<GroceryListItem item={item} />);
  expect(screen.getByTestId("swipe-container")).toHaveStyle({
    overflow: "hidden",
    borderRadius: 12,
    marginBottom: 8,
  });
});

it("still dims and strikes through checked content without dimming the background", async () => {
  const screen = await render(<GroceryListItem item={{ ...item, isChecked: true }} />);
  expect(screen.getByText("Cooking Oil")).toHaveStyle({ textDecorationLine: "line-through" });
  let node = screen.getByTestId("CheckSquareIcon");
  let contentOpacity = 1;
  const row = screen.getByRole("checkbox");
  while (node !== row) {
    contentOpacity *= StyleSheet.flatten(node.props.style)?.opacity ?? 1;
    node = node.parent!;
  }
  expect(contentOpacity).toBe(0.6);
});

it("preserves checking, swipe deletion and undo", async () => {
  const screen = await render(<GroceryListItem item={item} />);
  await fireEvent.press(screen.getByRole("checkbox"));
  expect(mockToggle).toHaveBeenCalledWith("cooking oil");
  mockSwipeableProps.onSwipeableOpen?.("left" as any);
  expect(mockDelete).toHaveBeenCalledWith("cooking oil", expect.any(Object));
  mockDelete.mock.calls[0]![1].onSuccess();
  const options = jest.mocked(toast).mock.calls[0]![1]!;
  const action = options.action;
  if (typeof action !== "object" || action === null || !("onClick" in action)) {
    throw new Error("Expected an Undo toast action");
  }
  action.onClick();
  expect(mockRestore).toHaveBeenCalledWith("cooking oil");
});

it("uses selection without toggling the purchase checkbox", async () => {
  const onToggleSelect = jest.fn();
  const screen = await render(
    <GroceryListItem
      item={{ ...item, isChecked: true }}
      isSelectionMode
      onToggleSelect={onToggleSelect}
    />
  );
  await fireEvent.press(screen.getByRole("button"));
  expect(onToggleSelect).toHaveBeenCalledTimes(1);
  expect(mockToggle).not.toHaveBeenCalled();
});
