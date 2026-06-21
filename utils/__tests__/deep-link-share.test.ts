import { handleShareDeepLink } from "../deep-link-share";

// recipe-share.ts (imported transitively for parseRecipeDeepLink) pulls in
// lib/analytics/funnel-events at module load, which in turn imports
// react-native-purchases-ui (outside transformIgnorePatterns). Mock the
// funnel layer so this pure-parser test does not boot the purchases graph.
jest.mock("~/lib/analytics/funnel-events", () => ({
  emitFunnelEvent: jest.fn(),
  emitShareLinkOpened: jest.fn(),
}));

describe("handleShareDeepLink", () => {
  const deps = {
    getRecipeById: jest.fn(),
    navigate: jest.fn(),
    alertNotInLibrary: jest.fn(),
    emitOpened: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("no-ops for a non-recipe URL (no side effects)", async () => {
    await handleShareDeepLink("https://example.com", deps);
    expect(deps.getRecipeById).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
    expect(deps.alertNotInLibrary).not.toHaveBeenCalled();
    expect(deps.emitOpened).not.toHaveBeenCalled();
  });

  it("no-ops for null input (cold start with no link)", async () => {
    await handleShareDeepLink(null, deps);
    expect(deps.getRecipeById).not.toHaveBeenCalled();
  });

  it("navigates to the recipe route when the recipe exists locally", async () => {
    deps.getRecipeById.mockResolvedValue({ id: "abc-1" });
    await handleShareDeepLink("cookkit://recipe/abc-1", deps);
    expect(deps.getRecipeById).toHaveBeenCalledWith("abc-1");
    expect(deps.navigate).toHaveBeenCalledWith("/recipes/abc-1");
    expect(deps.alertNotInLibrary).not.toHaveBeenCalled();
    expect(deps.emitOpened).toHaveBeenCalledWith("abc-1", true);
  });

  it("shows the not-in-library alert when the recipe is not local", async () => {
    deps.getRecipeById.mockResolvedValue(null);
    await handleShareDeepLink("cookkit://recipe/abc-1", deps);
    expect(deps.navigate).not.toHaveBeenCalled();
    expect(deps.alertNotInLibrary).toHaveBeenCalledWith("abc-1");
    expect(deps.emitOpened).toHaveBeenCalledWith("abc-1", false);
  });

  it("decodes a URL-encoded id before lookup and re-encodes for navigation", async () => {
    deps.getRecipeById.mockResolvedValue({ id: "a/b c" });
    await handleShareDeepLink("cookkit://recipe/a%2Fb%20c", deps);
    expect(deps.getRecipeById).toHaveBeenCalledWith("a/b c");
    expect(deps.navigate).toHaveBeenCalledWith("/recipes/a%2Fb%20c");
  });

  it("treats a thrown DB lookup as not-in-library (graceful degradation)", async () => {
    deps.getRecipeById.mockRejectedValue(new Error("db unavailable"));
    await handleShareDeepLink("cookkit://recipe/abc-1", deps);
    expect(deps.navigate).not.toHaveBeenCalled();
    expect(deps.alertNotInLibrary).toHaveBeenCalledWith("abc-1");
    expect(deps.emitOpened).toHaveBeenCalledWith("abc-1", false);
  });

  it("emits resolvedLocally=false even when the DB throws", async () => {
    deps.getRecipeById.mockRejectedValue(new Error("boom"));
    await handleShareDeepLink("cookkit://recipe/abc-1", deps);
    expect(deps.emitOpened).toHaveBeenCalledWith("abc-1", false);
  });

  it("never throws — the caller's promise always resolves", async () => {
    deps.getRecipeById.mockRejectedValue(new Error("boom"));
    await expect(handleShareDeepLink("cookkit://recipe/abc-1", deps)).resolves.toBeUndefined();
  });
});
