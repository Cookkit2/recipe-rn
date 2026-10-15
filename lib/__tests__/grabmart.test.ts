import Clipboard from "@react-native-clipboard/clipboard";
import { Linking } from "react-native";
import { shopOnGrabMart } from "../grabmart";
import {
  formatGrabMartShoppingList,
  GRABMART_DEEP_LINK,
  type GrabMartShoppingItem,
} from "~/utils/grabmart-shopping";

jest.mock("@react-native-clipboard/clipboard", () => ({
  __esModule: true,
  default: { setString: jest.fn() },
}));

jest.mock("react-native", () => ({
  Linking: { openURL: jest.fn() },
}));

const milk: GrabMartShoppingItem = {
  name: "Milk",
  neededQuantity: 0.5,
  unit: "l",
  isChecked: false,
  isCovered: false,
};

describe("GrabMart shopping handoff", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    jest.mocked(Linking.openURL).mockResolvedValue(undefined);
  });

  it("exports only remaining items with their needed quantities", () => {
    const items = [
      milk,
      { ...milk, name: "Eggs", neededQuantity: 6, unit: "piece" },
      { ...milk, name: "Rice", isChecked: true },
      { ...milk, name: "Salt", isCovered: true },
      { ...milk, name: "Flour", neededQuantity: 0 },
    ];
    const before = items.map((item) => ({ ...item }));

    expect(formatGrabMartShoppingList(items)).toBe("Milk — 0.5 l\nEggs — 6 piece");
    expect(items).toEqual(before);
  });

  it("removes subtraction noise without rounding tiny amounts to zero", () => {
    expect(
      formatGrabMartShoppingList([
        { ...milk, neededQuantity: 0.30000000000000004 },
        { ...milk, name: "Saffron", neededQuantity: 0.0001, unit: "g" },
      ])
    ).toBe("Milk — 0.3 l\nSaffron — 0.0001 g");
  });

  it("omits invalid quantities and trims names and units", () => {
    expect(
      formatGrabMartShoppingList([
        { ...milk, name: " Milk ", unit: " l " },
        { ...milk, neededQuantity: -1 },
        { ...milk, neededQuantity: NaN },
        { ...milk, neededQuantity: Infinity },
      ])
    ).toBe("Milk — 0.5 l");
  });

  it("copies the list before opening GrabMart without sending ingredients in the URL", async () => {
    jest.mocked(Linking.openURL).mockImplementation(async (url) => {
      expect(Clipboard.setString).toHaveBeenCalledWith("Milk — 0.5 l");
      expect(url).toBe(GRABMART_DEEP_LINK);
    });

    await expect(shopOnGrabMart([milk])).resolves.toBe("opened");
    expect(Linking.openURL).toHaveBeenCalledTimes(1);
  });

  it("opens GrabMart's webpage without forcing the missing app to launch again", async () => {
    jest.mocked(Linking.openURL).mockRejectedValueOnce(new Error("Grab not installed"));

    await expect(shopOnGrabMart([milk])).resolves.toBe("opened");
    expect(Linking.openURL).toHaveBeenNthCalledWith(1, GRABMART_DEEP_LINK);
    expect(Linking.openURL).toHaveBeenNthCalledWith(2, "https://www.grab.com/my/mart/");
    expect(Clipboard.setString).toHaveBeenCalledTimes(1);
  });

  it("keeps the copied list available when both links fail", async () => {
    jest.mocked(Linking.openURL).mockRejectedValue(new Error("Cannot open URL"));

    await expect(shopOnGrabMart([milk])).resolves.toBe("copied");
    expect(Clipboard.setString).toHaveBeenCalledWith("Milk — 0.5 l");
  });

  it("does not leave Cookkit when copying fails", async () => {
    jest.mocked(Clipboard.setString).mockImplementation(() => {
      throw new Error("Clipboard unavailable");
    });

    await expect(shopOnGrabMart([milk])).rejects.toThrow("Clipboard unavailable");
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("does not overwrite the clipboard or open Grab for an empty remaining list", async () => {
    await expect(shopOnGrabMart([])).resolves.toBe("empty");
    await expect(shopOnGrabMart([{ ...milk, isChecked: true }])).resolves.toBe("empty");
    expect(Clipboard.setString).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
