import {
  buildRecipeDeepLink,
  parseRecipeDeepLink,
  buildRecipeTextExport,
  shareRecipe,
  RECIPE_DEEP_LINK_SCHEME,
} from "../recipe-share";
import type { Recipe } from "~/types/Recipe";
import { Share } from "react-native";

jest.mock("react-native", () => ({
  Share: {
    share: jest.fn(),
    dismissedAction: "dismissedAction",
    sharedAction: "sharedAction",
  },
}));

// Mock the funnel emitter so we can assert calls without pulling in the
// MMKV-backed install anchor (mirrors subscription-utils.test.ts).
jest.mock("~/lib/analytics/funnel-events", () => ({
  emitFunnelEvent: jest.fn(),
}));

import { emitFunnelEvent } from "~/lib/analytics/funnel-events";

const baseRecipe: Recipe = {
  id: "recipe-123",
  title: "Spaghetti Carbonara",
  description: "A classic Roman pasta.",
  imageUrl: "https://example.com/photo.jpg",
  prepMinutes: 10,
  cookMinutes: 15,
  servings: 4,
  ingredients: [
    { name: "Spaghetti", relatedIngredientId: "i1", quantity: 200, unit: "g" },
    {
      name: "Egg yolks",
      relatedIngredientId: "i2",
      quantity: 3,
      unit: "",
      notes: "room temperature",
    },
  ],
  instructions: [
    { step: 1, title: "Boil", description: "Boil the pasta.", relatedIngredientIds: ["i1"] },
    { step: 2, title: "Mix", description: "Mix yolks and cheese.", relatedIngredientIds: ["i2"] },
  ],
  sourceUrl: "https://example.com/recipe",
};

describe("buildRecipeDeepLink", () => {
  it("builds a cookkit://recipe/<id> link", () => {
    expect(buildRecipeDeepLink("abc-1")).toBe("cookkit://recipe/abc-1");
  });

  it("is deterministic for repeated calls", () => {
    expect(buildRecipeDeepLink("abc-1")).toEqual(buildRecipeDeepLink("abc-1"));
  });

  it("URL-encodes the id so reserved characters round-trip", () => {
    expect(buildRecipeDeepLink("a/b c")).toBe("cookkit://recipe/a%2Fb%20c");
  });

  it("throws on an empty id (defensive)", () => {
    expect(() => buildRecipeDeepLink("")).toThrow(/non-empty/);
  });

  it("uses the documented scheme constant", () => {
    expect(RECIPE_DEEP_LINK_SCHEME).toBe("cookkit");
  });
});

describe("parseRecipeDeepLink", () => {
  it("parses a recipe deep link into { kind: recipe, recipeId }", () => {
    expect(parseRecipeDeepLink("cookkit://recipe/abc-1")).toEqual({
      kind: "recipe",
      recipeId: "abc-1",
    });
  });

  it("decodes URL-encoded ids", () => {
    expect(parseRecipeDeepLink("cookkit://recipe/a%2Fb%20c")).toEqual({
      kind: "recipe",
      recipeId: "a/b c",
    });
  });

  it("round-trips through buildRecipeDeepLink", () => {
    const link = buildRecipeDeepLink("weird id/with slashes");
    const parsed = parseRecipeDeepLink(link);
    expect(parsed).toEqual({ kind: "recipe", recipeId: "weird id/with slashes" });
  });

  it("returns unknown for null/undefined/empty input (cold start with no link)", () => {
    expect(parseRecipeDeepLink(null)).toEqual({ kind: "unknown" });
    expect(parseRecipeDeepLink(undefined)).toEqual({ kind: "unknown" });
    expect(parseRecipeDeepLink("")).toEqual({ kind: "unknown" });
  });

  it("returns unknown for a non-cookkit scheme", () => {
    expect(parseRecipeDeepLink("https://example.com/recipe/abc")).toEqual({ kind: "unknown" });
    expect(parseRecipeDeepLink("http://recipe/abc")).toEqual({ kind: "unknown" });
  });

  it("returns unknown for the cookkit scheme but a non-recipe host", () => {
    expect(parseRecipeDeepLink("cookkit://pantry/abc")).toEqual({ kind: "unknown" });
  });

  it("returns unknown when the recipe path has no id segment", () => {
    expect(parseRecipeDeepLink("cookkit://recipe/")).toEqual({ kind: "unknown" });
    expect(parseRecipeDeepLink("cookkit://recipe")).toEqual({ kind: "unknown" });
  });

  it("tolerates a trailing slash and query string", () => {
    expect(parseRecipeDeepLink("cookkit://recipe/abc-1/")).toEqual({
      kind: "recipe",
      recipeId: "abc-1",
    });
    expect(parseRecipeDeepLink("cookkit://recipe/abc-1?ref=share")).toEqual({
      kind: "recipe",
      recipeId: "abc-1",
    });
  });

  it("returns unknown for a malformed URL", () => {
    expect(parseRecipeDeepLink("not-a-url")).toEqual({ kind: "unknown" });
    expect(parseRecipeDeepLink("::::")).toEqual({ kind: "unknown" });
  });
});

describe("buildRecipeTextExport", () => {
  it("is deterministic — same input yields byte-identical output", () => {
    const a = buildRecipeTextExport(baseRecipe);
    const b = buildRecipeTextExport(baseRecipe);
    expect(a).toBe(b);
  });

  it("includes the title, servings, total time, and description", () => {
    const out = buildRecipeTextExport(baseRecipe);
    expect(out).toContain("Spaghetti Carbonara");
    expect(out).toContain("Servings: 4");
    expect(out).toContain("Total time: 25 minutes"); // 10 prep + 15 cook
    expect(out).toContain("A classic Roman pasta.");
  });

  it("emits a bulleted ingredient list with quantity/unit/notes", () => {
    const out = buildRecipeTextExport(baseRecipe);
    expect(out).toContain("Ingredients:");
    expect(out).toContain("- 200 g Spaghetti");
    expect(out).toContain("- 3 Egg yolks (room temperature)");
  });

  it("emits a numbered steps list in step order", () => {
    const out = buildRecipeTextExport(baseRecipe);
    expect(out).toContain("Instructions:");
    expect(out).toContain("1. Boil: Boil the pasta.");
    expect(out).toContain("2. Mix: Mix yolks and cheese.");
  });

  it("sorts steps by the step field even if input is out of order", () => {
    const shuffled: Recipe = {
      ...baseRecipe,
      instructions: [
        { step: 2, title: "Mix", description: "Mix.", relatedIngredientIds: [] },
        { step: 1, title: "Boil", description: "Boil.", relatedIngredientIds: [] },
      ],
    };
    const out = buildRecipeTextExport(shuffled);
    const boilIdx = out.indexOf("1. Boil");
    const mixIdx = out.indexOf("2. Mix");
    expect(boilIdx).toBeGreaterThan(-1);
    expect(boilIdx).toBeLessThan(mixIdx);
  });

  it("includes source attribution from sourceUrl", () => {
    const out = buildRecipeTextExport(baseRecipe);
    expect(out).toContain("Recipe from https://example.com/recipe");
  });

  it("falls back to a Cookkit attribution when sourceUrl is absent", () => {
    const noSource: Recipe = { ...baseRecipe, sourceUrl: undefined };
    const out = buildRecipeTextExport(noSource);
    expect(out).toContain("Shared from Cookkit");
    expect(out).not.toContain("Recipe from undefined");
  });

  it("omits the servings line when servings is missing or zero", () => {
    const noServings: Recipe = { ...baseRecipe, servings: undefined };
    expect(buildRecipeTextExport(noServings)).not.toContain("Servings:");
    const zeroServings: Recipe = { ...baseRecipe, servings: 0 };
    expect(buildRecipeTextExport(zeroServings)).not.toContain("Servings:");
  });

  it("omits the time line when both prep and cook are missing", () => {
    const noTime: Recipe = { ...baseRecipe, prepMinutes: undefined, cookMinutes: undefined };
    expect(buildRecipeTextExport(noTime)).not.toContain("Total time:");
  });

  it("formats fractional quantities deterministically (no trailing zeros)", () => {
    const fractional: Recipe = {
      ...baseRecipe,
      ingredients: [
        { name: "Flour", relatedIngredientId: "i1", quantity: 1.5, unit: "cup" },
        { name: "Salt", relatedIngredientId: "i2", quantity: 0.25, unit: "tsp" },
      ],
    };
    const out = buildRecipeTextExport(fractional);
    expect(out).toContain("- 1.5 cup Flour");
    expect(out).toContain("- 0.25 tsp Salt");
  });

  it("does not include a trailing quantity/unit when both are absent", () => {
    const qtyless: Recipe = {
      ...baseRecipe,
      ingredients: [{ name: "Salt", relatedIngredientId: "i1", quantity: 0, unit: "" }],
    };
    expect(buildRecipeTextExport(qtyless)).toContain("- Salt");
    expect(buildRecipeTextExport(qtyless)).not.toContain("0 Salt");
  });
});

describe("shareRecipe", () => {
  const mockedShare = Share.share as jest.MockedFunction<typeof Share.share>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("emits share_link_created before opening the sheet", async () => {
    mockedShare.mockResolvedValue({ action: Share.sharedAction as "sharedAction" });
    await shareRecipe(baseRecipe);
    const createdCall = (emitFunnelEvent as jest.Mock).mock.calls.find(
      ([type]) => type === "share_link_created"
    );
    expect(createdCall).toBeDefined();
    expect(createdCall![1]).toMatchObject({ detail: { recipeId: "recipe-123" } });
  });

  it("emits share_exported when the user completes a share", async () => {
    mockedShare.mockResolvedValue({ action: Share.sharedAction as "sharedAction" });
    await shareRecipe(baseRecipe);
    const exportedCall = (emitFunnelEvent as jest.Mock).mock.calls.find(
      ([type]) => type === "share_exported"
    );
    expect(exportedCall).toBeDefined();
    expect(exportedCall![1]).toMatchObject({ detail: { recipeId: "recipe-123" } });
  });

  it("passes the text export + deep link as the share message", async () => {
    mockedShare.mockResolvedValue({ action: Share.sharedAction as "sharedAction" });
    await shareRecipe(baseRecipe);
    const arg = mockedShare.mock.calls[0]![0];
    expect(arg.message).toContain("Spaghetti Carbonara");
    expect(arg.message).toContain("cookkit://recipe/recipe-123");
    expect(arg.message).toContain("Open in Cookkit");
  });

  it("returns { action: shared } on a completed share", async () => {
    mockedShare.mockResolvedValue({ action: Share.sharedAction as "sharedAction" });
    await expect(shareRecipe(baseRecipe)).resolves.toEqual({ action: "shared" });
  });

  it("returns { action: dismissed } and does NOT emit share_exported when dismissed", async () => {
    mockedShare.mockResolvedValue({ action: Share.dismissedAction as "dismissedAction" });
    const result = await shareRecipe(baseRecipe);
    expect(result).toEqual({ action: "dismissed" });
    const exportedCall = (emitFunnelEvent as jest.Mock).mock.calls.find(
      ([type]) => type === "share_exported"
    );
    expect(exportedCall).toBeUndefined();
    // share_link_created still fired (the link was generated).
    const createdCall = (emitFunnelEvent as jest.Mock).mock.calls.find(
      ([type]) => type === "share_link_created"
    );
    expect(createdCall).toBeDefined();
  });

  it("returns { action: dismissed } when Share.share rejects (Android dismissal / unavailable)", async () => {
    mockedShare.mockRejectedValue(new Error("User did not share"));
    const result = await shareRecipe(baseRecipe);
    expect(result).toEqual({ action: "dismissed" });
    const exportedCall = (emitFunnelEvent as jest.Mock).mock.calls.find(
      ([type]) => type === "share_exported"
    );
    expect(exportedCall).toBeUndefined();
  });

  it("never throws — analytics or share failures degrade to dismissed", async () => {
    mockedShare.mockRejectedValue(new Error("boom"));
    await expect(shareRecipe(baseRecipe)).resolves.toBeDefined();
  });
});
