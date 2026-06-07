import { Platform } from "react-native";
import { supportsActivityType } from "../achievement-share";

describe("achievement-share", () => {
  describe("supportsActivityType", () => {
    let originalPlatformOS: typeof Platform.OS;

    beforeEach(() => {
      originalPlatformOS = Platform.OS;
    });

    afterEach(() => {
      Platform.OS = originalPlatformOS;
    });

    it("returns true on android for any activity type", () => {
      Platform.OS = "android";
      expect(supportsActivityType("com.apple.UIKit.activity.PostToTwitter")).toBe(true);
      expect(supportsActivityType("com.custom.activity")).toBe(true);
    });

    it("returns true on ios for supported activity types", () => {
      Platform.OS = "ios";
      expect(supportsActivityType("com.apple.UIKit.activity.PostToTwitter")).toBe(true);
      expect(supportsActivityType("com.apple.UIKit.activity.Mail")).toBe(true);
    });

    it("returns false on ios for unsupported activity types", () => {
      Platform.OS = "ios";
      expect(supportsActivityType("com.custom.activity")).toBe(false);
      expect(supportsActivityType("com.apple.UIKit.activity.Unknown")).toBe(false);
    });
  });
});
