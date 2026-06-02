export function centsToDollars(cents: number): number {
  return cents / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(Number(dollars + "e2"));
}

export function formatCurrency(cents: number, currency = "MYR"): string {
  const dollars = centsToDollars(cents);
  return `${currency} ${dollars.toFixed(2)}`;
}

export function calculateTotalPrice(items: Array<{ priceCents: number }>): number {
  return items.reduce((sum, item) => sum + item.priceCents, 0);
}

export interface PriceByCategory {
  category: string;
  totalCents: number;
  itemCount: number;
}

export function groupPricesByCategory(
  items: Array<{ priceCents: number; category?: string }>
): PriceByCategory[] {
  const categoryMap = new Map<string, { total: number; count: number }>();

  for (const item of items) {
    const category = item.category || "other";
    const existing = categoryMap.get(category) || { total: 0, count: 0 };
    categoryMap.set(category, {
      total: existing.total + item.priceCents,
      count: existing.count + 1,
    });
  }

  return Array.from(categoryMap.entries())
    .map(([category, { total, count }]) => ({
      category,
      totalCents: total,
      itemCount: count,
    }))
    .sort((a, b) => b.totalCents - a.totalCents);
}
