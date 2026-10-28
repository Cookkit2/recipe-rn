export const INGREDIENT_IMAGE_SIZE = 64;
export const INGREDIENT_STRIP_HEIGHT = 72;
export const INGREDIENT_GRID_GAP = 24;
const GRID_PADDING = 8;

export interface IngredientSourceFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface SafeInsets {
  top: number;
  bottom: number;
}

/** Full-screen scrolling with safe padding below the close control and after the final label. */
export function ingredientOverlayLayout(
  width: number,
  height: number,
  insets: SafeInsets,
  count: number,
  labelHeights: Readonly<Record<number, number>> = {},
  fontScale = 1
) {
  const panelWidth = Math.max(1, Math.min(width - 48, 480));
  const panelTop = insets.top + 16;
  const headerHeight = 44;
  const columnWidth = (panelWidth - GRID_PADDING * 2) / 3;
  const topPadding = panelTop + headerHeight + 8;
  const bottomPadding = insets.bottom + 24;
  const rowTops: number[] = [];
  let contentHeight = topPadding;
  for (let start = 0; start < count; start += 3) {
    let labelHeight = 54 * fontScale;
    for (let index = start; index < Math.min(start + 3, count); index++) {
      rowTops[index] = contentHeight;
      labelHeight = Math.max(labelHeight, labelHeights[index] ?? 0);
    }
    contentHeight += INGREDIENT_IMAGE_SIZE + 8 + labelHeight;
    if (start + 3 < count) contentHeight += INGREDIENT_GRID_GAP;
  }
  return {
    sourceClipTop: insets.top + 48,
    sourceClipBottom: insets.bottom + 72,
    left: (width - panelWidth) / 2,
    top: panelTop,
    width: panelWidth,
    headerHeight,
    gridTop: 0,
    viewportHeight: height,
    topPadding,
    columnWidth,
    gridPadding: GRID_PADDING,
    rowTops,
    contentHeight: contentHeight + bottomPadding,
    bottomPadding,
  };
}

/** Content coordinates include scroll offset, matching taps in the scrollable backdrop. */
export function isIngredientGalleryItemAtPoint(
  { x, y }: { x: number; y: number },
  layout: ReturnType<typeof ingredientOverlayLayout>,
  labelHeights: Readonly<Record<number, number>> = {},
  fontScale = 1
) {
  return layout.rowTops.some((top, index) => {
    const left = layout.left + layout.gridPadding + (index % 3) * layout.columnWidth;
    const imageLeft = left + (layout.columnWidth - INGREDIENT_IMAGE_SIZE) / 2;
    const onImage =
      x >= imageLeft &&
      x <= imageLeft + INGREDIENT_IMAGE_SIZE &&
      y >= top &&
      y <= top + INGREDIENT_IMAGE_SIZE;
    const labelTop = top + INGREDIENT_IMAGE_SIZE + 8;
    const onLabel =
      x >= left + 4 &&
      x <= left + layout.columnWidth - 4 &&
      y >= labelTop &&
      y <= labelTop + (labelHeights[index] ?? 54 * fontScale);
    return onImage || onLabel;
  });
}
