export interface ListCell<T> {
  item: T;
  index: number;
  key: string;
}

export interface ListRow<T> {
  key: string;
  cells: ListCell<T>[];
}

/** Recycle a whole grid row so an odd final item keeps its normal column width. */
export function createListRows<T>(
  data: readonly T[],
  columns: number,
  keyExtractor: (item: T, index: number) => string
): ListRow<T>[] {
  if (!Number.isSafeInteger(columns) || columns < 1) {
    throw new Error("RecyclingList numColumns must be a positive integer.");
  }
  const seen = new Set<string>();
  const rows: ListRow<T>[] = [];
  data.forEach((item, index) => {
    const key = keyExtractor(item, index);
    if (typeof key !== "string" || seen.has(key)) {
      throw new Error("RecyclingList requires a unique string key for every item.");
    }
    seen.add(key);
    if (index % columns === 0) rows.push({ key: "", cells: [] });
    rows[rows.length - 1]!.cells.push({ item, index, key });
  });
  for (const row of rows) row.key = JSON.stringify(row.cells.map((cell) => cell.key));
  return rows;
}

export function rangeForRows<T>(rows: readonly ListRow<T>[], first: number, last: number) {
  const firstCell = rows[first]?.cells[0];
  const lastCells = rows[last]?.cells;
  const lastCell = lastCells?.[lastCells.length - 1];
  return firstCell && lastCell ? { first: firstCell.index, last: lastCell.index } : undefined;
}
