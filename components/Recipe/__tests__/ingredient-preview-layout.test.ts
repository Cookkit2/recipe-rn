import { ingredientOverlayLayout } from "../Details/ingredient-preview-layout";

it.each([1, 6, 19, 50])(
  "uses the full screen with safe padding above and below %i ingredients",
  (count) => {
    const layout = ingredientOverlayLayout(393, 852, { top: 59, bottom: 34 }, count);
    expect(layout.top).toBeGreaterThanOrEqual(75);
    expect(layout.gridTop).toBe(0);
    expect(layout.viewportHeight).toBe(852);
    expect(layout.rowTops[0]).toBeGreaterThanOrEqual(59 + 16 + layout.headerHeight);
    const bottom = layout.rowTops[count - 1]! + 64 + 8 + 54;
    expect(layout.contentHeight - bottom).toBe(34 + 24);
    const maxScroll = Math.max(0, layout.contentHeight - layout.viewportHeight);
    expect(bottom - maxScroll).toBeLessThanOrEqual(852 - 34 - 24);
    if (count === 19) expect(layout.contentHeight).toBeGreaterThan(layout.viewportHeight);
  }
);

it("sizes each row for its longest measured label, including enlarged text", () => {
  const layout = ingredientOverlayLayout(
    393,
    852,
    { top: 59, bottom: 34 },
    19,
    { 2: 180, 18: 220 },
    2
  );
  expect(layout.rowTops[3]).toBe(layout.topPadding + 64 + 8 + 180 + 24);
  expect(layout.contentHeight).toBeGreaterThanOrEqual(layout.rowTops[18]! + 64 + 8 + 220 + 34);
});
