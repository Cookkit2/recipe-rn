import { extractMicrodata } from "../WebsiteRecipeService";

describe("WebsiteRecipeService ReDoS", () => {
  it("does not take exponentially long with another malicious string", () => {
    // Attempting to trigger ReDoS by making the unquoted group fail very late
    const html = '<meta itemprop="recipeYield" content=' + "a".repeat(50000) + " \x00";

    const startTime = Date.now();
    const result = extractMicrodata(html);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(100);
  });
});
