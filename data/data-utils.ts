import type { PantryItem } from "~/types/PantryItem";

export const getDaysUntilExpiry = (expiryDate?: Date): number | null => {
  if (!expiryDate) return null;
  const diffTime = expiryDate.getTime() - new Date().getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const sortPantryItems = (items: PantryItem[]): PantryItem[] => {
  // Add random property for stable sorting, then sort by expiry
  const itemsWithRandom = items.map((item) => ({
    ...item,
    randomSeed: Math.random(),
  }));

  return itemsWithRandom.sort((a, b) => {
    const aDays = getDaysUntilExpiry(a.expiry_date);
    const bDays = getDaysUntilExpiry(b.expiry_date);
    if (aDays === null && bDays === null) return a.randomSeed - b.randomSeed;
    if (aDays === null) return 1;
    if (bDays === null) return -1;
    if (aDays === bDays) return a.randomSeed - b.randomSeed; // Use stable random seed for ties
    return aDays - bDays;
  });
};
