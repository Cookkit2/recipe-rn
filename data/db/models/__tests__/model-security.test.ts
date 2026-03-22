import { Challenge, Achievement, Recipe } from "../index";

// Mock log to avoid console noise during tests
jest.mock("~/utils/logger", () => ({
  log: {
    error: jest.fn(),
  },
}));

describe("Model Security - Safe JSON Parsing", () => {
  describe("Challenge Model", () => {
    it("returns default values when requirement JSON is invalid", () => {
      const challenge = new Challenge();
      // @ts-ignore - manipulating internal property for testing
      challenge._raw = { requirement: "invalid-json" };

      const requirement = challenge.parsedRequirement;
      expect(requirement).toEqual({
        type: "cook_recipes",
        target: 0,
        description: "",
      });
    });

    it("returns default values when reward JSON is invalid", () => {
      const challenge = new Challenge();
      // @ts-ignore
      challenge._raw = { reward: "{ malformed json" };

      const reward = challenge.parsedReward;
      expect(reward).toEqual({ xp: 0 });
    });
  });

  describe("Achievement Model", () => {
    it("returns default values when requirement JSON is invalid", () => {
      const achievement = new Achievement();
      // @ts-ignore
      achievement._raw = { requirement: "!!!" };

      const requirement = achievement.parsedRequirement;
      expect(requirement).toEqual({
        type: "count",
        target: 0,
      });
    });

    it("returns default values when reward JSON is invalid", () => {
      const achievement = new Achievement();
      // @ts-ignore
      achievement._raw = { reward: "invalid" };

      const reward = achievement.parsedReward;
      expect(reward).toEqual({
        type: "badge",
        value: "",
      });
    });
  });

  describe("Recipe Model", () => {
    it("returns empty array when tags JSON is invalid", () => {
      const recipe = new Recipe();
      // @ts-ignore
      recipe._raw = { tags: "[1, 2, " };

      const tags = recipe.tags;
      expect(tags).toEqual([]);
    });
  });
});
