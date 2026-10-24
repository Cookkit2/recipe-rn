import { renderHook } from "@testing-library/react-native";
import { Appearance } from "react-native";
import { useUniwind } from "uniwind";
import { useNativeAppearance } from "../useNativeAppearance";

jest.mock("uniwind", () => ({ useUniwind: jest.fn() }));

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
