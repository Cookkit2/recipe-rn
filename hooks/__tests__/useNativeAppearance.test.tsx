import { renderHook } from "@testing-library/react-native";
import { AppState, Appearance, type AppStateStatus } from "react-native";
import { useUniwind } from "uniwind";
import { useNativeAppearance } from "../useNativeAppearance";

jest.mock("uniwind", () => ({ useUniwind: jest.fn() }));
jest.mock("react-native/Libraries/AppState/AppState", () => ({
  __esModule: true,
  default: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
}));

afterEach(() => jest.restoreAllMocks());

it("updates native appearance for manual themes and restores the system preference", async () => {
  const setColorScheme = jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {});
  const theme = jest.mocked(useUniwind);
  theme.mockReturnValue({ theme: "dark", hasAdaptiveThemes: false });
  const { rerender } = await renderHook(useNativeAppearance);
  expect(setColorScheme).toHaveBeenLastCalledWith("dark");
  theme.mockReturnValue({ theme: "light", hasAdaptiveThemes: false });
  await rerender({});
  expect(setColorScheme).toHaveBeenLastCalledWith("light");
  theme.mockReturnValue({ theme: "dark", hasAdaptiveThemes: true });
  await rerender({});
  expect(setColorScheme).toHaveBeenLastCalledWith("auto");
  setColorScheme.mockRestore();
});

it("reapplies the latest preference to the active window and removes old listeners", async () => {
  const setColorScheme = jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {});
  let onAppStateChange: ((state: AppStateStatus) => void) | undefined;
  const removeListeners: jest.Mock[] = [];
  jest.spyOn(AppState, "addEventListener").mockImplementation((_event, listener) => {
    onAppStateChange = listener;
    const remove = jest.fn();
    removeListeners.push(remove);
    return { remove };
  });
  jest.mocked(useUniwind).mockReturnValue({ theme: "dark", hasAdaptiveThemes: false });
  const { rerender, unmount } = await renderHook(useNativeAppearance);

  setColorScheme.mockClear();
  onAppStateChange?.("background");
  expect(setColorScheme).not.toHaveBeenCalled();
  onAppStateChange?.("active");
  expect(setColorScheme).toHaveBeenLastCalledWith("dark");

  jest.mocked(useUniwind).mockReturnValue({ theme: "light", hasAdaptiveThemes: true });
  await rerender({});
  expect(removeListeners[0]).toHaveBeenCalledTimes(1);
  setColorScheme.mockClear();
  onAppStateChange?.("active");
  expect(setColorScheme).toHaveBeenLastCalledWith("auto");

  await unmount();
  expect(removeListeners.at(-1)).toHaveBeenCalledTimes(1);
});
