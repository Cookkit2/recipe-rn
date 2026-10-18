export function paginateFilterChips<T>(
  chips: readonly { value: T; width: number }[],
  pageWidth: number,
  gap: number
): T[][] {
  const pages: T[][] = [];
  let page: T[] = [];
  let usedWidth = 0;
  for (const { value, width } of chips) {
    const nextWidth = page.length === 0 ? width : usedWidth + gap + width;
    if (page.length > 0 && nextWidth > pageWidth) {
      pages.push(page);
      page = [];
      usedWidth = 0;
    }
    usedWidth = page.length === 0 ? width : usedWidth + gap + width;
    page.push(value);
  }
  if (page.length > 0) pages.push(page);
  return pages;
}
