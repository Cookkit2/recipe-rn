import {
  ingredientOverlayLayout,
  isIngredientGalleryItemAtPoint,
} from "../Details/ingredient-preview-layout";

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

it("distinguishes images and labels from margins, gaps, and unused columns", () => {
  const layout = ingredientOverlayLayout(393, 852, { top: 59, bottom: 34 }, 4);
  const x = layout.left + layout.gridPadding + layout.columnWidth / 2;
  const top = layout.rowTops[0]!;
  expect(isIngredientGalleryItemAtPoint({ x, y: top + 32 }, layout)).toBe(true);
  expect(isIngredientGalleryItemAtPoint({ x, y: top + 82 }, layout)).toBe(true);
  expect(isIngredientGalleryItemAtPoint({ x: 5, y: top + 32 }, layout)).toBe(false);
  expect(
    isIngredientGalleryItemAtPoint({ x: x + layout.columnWidth / 2, y: top + 32 }, layout)
  ).toBe(false);
  expect(isIngredientGalleryItemAtPoint({ x, y: layout.rowTops[3]! - 12 }, layout)).toBe(false);
  expect(
    isIngredientGalleryItemAtPoint(
      { x: x + layout.columnWidth, y: layout.rowTops[3]! + 32 },
      layout
    )
  ).toBe(false);
  expect(isIngredientGalleryItemAtPoint({ x: 195, y: 800 }, layout)).toBe(false);
});

it("keeps enlarged and multiline ingredient labels tappable without dismissing", () => {
  const heights = { 2: 180 };
  const layout = ingredientOverlayLayout(393, 852, { top: 59, bottom: 34 }, 4, heights, 2);
  const x = layout.left + layout.gridPadding + layout.columnWidth * 2.5;
  expect(
    isIngredientGalleryItemAtPoint({ x, y: layout.rowTops[2]! + 72 + 170 }, layout, heights, 2)
  ).toBe(true);
  expect(
    isIngredientGalleryItemAtPoint({ x, y: layout.rowTops[3]! - 12 }, layout, heights, 2)
  ).toBe(false);
});
