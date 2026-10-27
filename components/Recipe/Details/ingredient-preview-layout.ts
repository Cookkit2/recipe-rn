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

/** Full-screen scrolling with safe padding before the title and after the final label. */
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
  const headerHeight = Math.max(64, 48 * fontScale + 16);
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
