import { fireEvent, render } from "@testing-library/react-native";
import { useVideoPlayer } from "expo-video";
import GrabMartShoppingGuide from "../GrabMartShoppingGuide";

const mockPlayer = { loop: false, muted: false, play: jest.fn(), pause: jest.fn() };

jest.mock("expo-video", () => {
  const { View } = require("react-native");
  return {
    useVideoPlayer: jest.fn((_source, setup) => {
      setup(mockPlayer);
      return mockPlayer;
    }),
    VideoView: (props: any) => <View {...props} testID="tutorial-video" />,
  };
});
jest.mock("expo-image", () => {
  const { View } = require("react-native");
  return { Image: (props: any) => <View {...props} /> };
});
jest.mock("@rn-primitives/portal", () => ({ Portal: ({ children }: any) => children }));
jest.mock("@expo/ui/community/bottom-sheet", () => {
  const { View, ScrollView } = require("react-native");
  return {
    __esModule: true,
    default: (props: any) => <View {...props} testID="tutorial-sheet" />,
    BottomSheetView: View,
    BottomSheetScrollView: ScrollView,
  };
});
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 20 }) }));
jest.mock("~/hooks/useColor", () => () => ({ card: "black" }));
jest.mock("~/utils/logger", () => ({ log: { warn: jest.fn() } }));
jest.mock("~/components/ui/button", () => {
  const { Pressable } = require("react-native");
  return {
    Button: ({ isLoading, ...props }: any) => <Pressable {...props} accessibilityRole="button" />,
  };
});

beforeEach(() => jest.clearAllMocks());

it("plays the supplied tutorial muted and looping without cropping it", async () => {
  const screen = await render(
    <GrabMartShoppingGuide
      list="Eggs — 3 piece"
      busy={false}
      onContinue={jest.fn()}
      onClose={jest.fn()}
    />
  );
  expect(useVideoPlayer).toHaveBeenCalledWith(
    "https://npeumniwtoipfvuqqqwl.supabase.co/storage/v1/object/public/frame/grab-mart-tutorial.mov",
    expect.any(Function)
  );
  expect(mockPlayer.loop).toBe(true);
  expect(mockPlayer.muted).toBe(true);
  expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId("tutorial-video").props.contentFit).toBe("contain");
  expect(screen.getByTestId("tutorial-video").props.nativeControls).toBe(false);
  await screen.unmount();
  expect(mockPlayer.pause).toHaveBeenCalled();
});

it("offers Continue and swipe dismissal", async () => {
  const onContinue = jest.fn();
  const onClose = jest.fn();
  const screen = await render(
    <GrabMartShoppingGuide list="Eggs" busy={false} onContinue={onContinue} onClose={onClose} />
  );
  await fireEvent.press(screen.getByRole("button", { name: "Continue" }));
  expect(onContinue).toHaveBeenCalledTimes(1);
  await fireEvent(screen.getByTestId("tutorial-sheet"), "onChange", -1);
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("pauses the tutorial and disables dismissal while copying", async () => {
  const screen = await render(
    <GrabMartShoppingGuide list="Eggs" busy onContinue={jest.fn()} onClose={jest.fn()} />
  );
  expect(mockPlayer.play).not.toHaveBeenCalled();
  expect(mockPlayer.pause).toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  expect(screen.getByTestId("tutorial-sheet").props.enablePanDownToClose).toBe(false);
});
