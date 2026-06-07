jest.mock("expo-store-review", () => ({}));
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Share: { share: jest.fn() },
}));

import { getAchievementShareUrl } from "../achievement-share";

describe("getAchievementShareUrl", () => {
  it("should generate a URL with a standard achievement ID", () => {
    const result = getAchievementShareUrl("streak-7-days");
    expect(result).toBe("https://cookkit.app/achievement/streak-7-days");
  });

  it("should handle UUIDs correctly", () => {
    const uuid = "123e4567-e89b-12d3-a456-426614174000";
    const result = getAchievementShareUrl(uuid);
    expect(result).toBe(`https://cookkit.app/achievement/${uuid}`);
  });

  it("should handle numeric IDs", () => {
    const result = getAchievementShareUrl("12345");
    expect(result).toBe("https://cookkit.app/achievement/12345");
  });

  it("should handle empty strings", () => {
    const result = getAchievementShareUrl("");
    expect(result).toBe("https://cookkit.app/achievement/");
  });

  it("should handle IDs with special characters", () => {
    const result = getAchievementShareUrl("master_chef@2024!");
    expect(result).toBe("https://cookkit.app/achievement/master_chef@2024!");
  });
});
