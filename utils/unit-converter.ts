// Unit conversion utilities
// Supports converting between SI (metric) and Imperial unit systems for common kitchen measurements.
// Provided functions:
//  - convertToUnitSystem(quantity, unit, targetSystem)
//  - roundToReasonablePrecision(value)
//
// Design principles:
//  * Non-destructive: if unit unknown or already in desired system, returns original.
//  * Conservative rounding to avoid cumulative floating error.
//  * Handles weight (g<->oz, kg<->lb), volume (ml<->fl_oz, l<->qt), and count units (left unchanged).
//  * Extendable via UNIT_MAP.

export type UnitSystem = "metric" | "imperial";

export interface ConvertedQuantity {
  quantity: number;
  unit: string;
}

export interface UnitDef {
  system: UnitSystem;
  base: string; // canonical SI base unit for dimension (e.g., g, ml)
  toBase: (v: number) => number; // convert from this unit to base
  fromBase: (v: number) => number; // convert from base to this unit
  dimension: "weight" | "volume" | "count" | "other";
  // Preferred target unit when converting to opposite system at human scale
  prefer?: {
    toMetric?: string;
    toImperial?: string;
  };
}

// Constants
const OZ_IN_G = 28.349523125; // 1 oz in g
const LB_IN_G = 453.59237; // 1 lb in g
const ML_IN_FL_OZ = 29.5735295625; // 1 US fl oz in ml
const QT_IN_L = 0.946352946; // 1 US quart in liters
const GAL_IN_L = 3.785411784; // 1 US gallon in liters
const CUP_IN_ML = 236.588; // 1 US cup in ml
const TBSP_IN_ML = 14.7868; // 1 US tablespoon in ml
const TSP_IN_ML = 4.92892; // 1 US teaspoon in ml
const PINT_IN_ML = 473.176; // 1 US pint in ml

// Registry of supported units
export const UNIT_MAP: Record<string, UnitDef> = {
  // Weight
  g: {
    system: "metric",
    base: "g",
    dimension: "weight",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  kg: {
    system: "metric",
    base: "g",
    dimension: "weight",
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
    prefer: { toImperial: "lb" },
  },
  oz: {
    system: "imperial",
    base: "g",
    dimension: "weight",
    toBase: (v) => v * OZ_IN_G,
    fromBase: (v) => v / OZ_IN_G,
    prefer: { toMetric: "g" },
  },
  lb: {
    system: "imperial",
    base: "g",
    dimension: "weight",
    toBase: (v) => v * LB_IN_G,
    fromBase: (v) => v / LB_IN_G,
    prefer: { toMetric: "kg" },
  },

  // Volume
  ml: {
    system: "metric",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  l: {
    system: "metric",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * 1000,
    fromBase: (v) => v / 1000,
    prefer: { toImperial: "qt" },
  },
  fl_oz: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * ML_IN_FL_OZ,
    fromBase: (v) => v / ML_IN_FL_OZ,
    prefer: { toMetric: "ml" },
  },
  qt: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * QT_IN_L * 1000,
    fromBase: (v) => v / (QT_IN_L * 1000),
    prefer: { toMetric: "l" },
  },
  gal: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * GAL_IN_L * 1000,
    fromBase: (v) => v / (GAL_IN_L * 1000),
    prefer: { toMetric: "l" },
  },
  gallon: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * GAL_IN_L * 1000,
    fromBase: (v) => v / (GAL_IN_L * 1000),
    prefer: { toMetric: "l" },
  },
  cup: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * CUP_IN_ML,
    fromBase: (v) => v / CUP_IN_ML,
    prefer: { toMetric: "ml" },
  },
  tbsp: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * TBSP_IN_ML,
    fromBase: (v) => v / TBSP_IN_ML,
    prefer: { toMetric: "ml" },
  },
  tablespoon: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * TBSP_IN_ML,
    fromBase: (v) => v / TBSP_IN_ML,
    prefer: { toMetric: "ml" },
  },
  tsp: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * TSP_IN_ML,
    fromBase: (v) => v / TSP_IN_ML,
    prefer: { toMetric: "ml" },
  },
  teaspoon: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * TSP_IN_ML,
    fromBase: (v) => v / TSP_IN_ML,
    prefer: { toMetric: "ml" },
  },
  pt: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * PINT_IN_ML,
    fromBase: (v) => v / PINT_IN_ML,
    prefer: { toMetric: "ml" },
  },
  pint: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * PINT_IN_ML,
    fromBase: (v) => v / PINT_IN_ML,
    prefer: { toMetric: "ml" },
  },

  // Count / others (won't convert)
  unit: {
    system: "metric",
    base: "unit",
    dimension: "count",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  units: {
    system: "metric",
    base: "unit",
    dimension: "count",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  piece: {
    system: "metric",
    base: "unit",
    dimension: "count",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  pieces: {
    system: "metric",
    base: "unit",
    dimension: "count",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  pcs: {
    system: "metric",
    base: "unit",
    dimension: "count",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  count: {
    system: "metric",
    base: "unit",
    dimension: "count",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
};

// Small helper to choose a human friendly unit when converting
function choosePreferredUnit(baseValue: number, base: string, targetSystem: UnitSystem): string {
  // Weight logic
  if (base === "g") {
    if (targetSystem === "imperial") {
      // If >= 453g => pounds else ounces
      return baseValue >= LB_IN_G * 0.75 ? "lb" : "oz";
    } else {
      // target metric, decide between g and kg
      return baseValue >= 750 ? "kg" : "g";
    }
  }
  if (base === "ml") {
    if (targetSystem === "imperial") {
      // if >= ~473ml (~0.5 qt) use qt else fl_oz
      return baseValue >= 473 ? "qt" : "fl_oz";
    } else {
      return baseValue >= 750 ? "l" : "ml";
    }
  }
  return base; // default fallback
}

export function roundToReasonablePrecision(value: number): number {
  if (!isFinite(value)) return value;
  // Round to 3 decimal places, then trim trailing zeros when formatted elsewhere
  return Math.round(value * 1000) / 1000;
}

export function convertToUnitSystem(
  quantity: number,
  unit: string,
  targetSystem: UnitSystem
): ConvertedQuantity {
  if (quantity == null || isNaN(quantity) || !unit) {
    return { quantity, unit } as ConvertedQuantity;
  }

  const normalizedUnit = unit.toLowerCase();
  const def = UNIT_MAP[normalizedUnit];
  if (!def) {
    // Unknown unit: don't convert
    return { quantity, unit };
  }

  if (def.dimension === "count" || def.system === targetSystem) {
    // Already correct system or non-convertible
    return { quantity, unit: def.system === targetSystem ? unit : unit };
  }

  // Convert quantity into base unit
  const baseValue = def.toBase(quantity);

  // Choose appropriate target unit within the other system
  const targetUnit =
    def.prefer?.[targetSystem === "metric" ? "toMetric" : "toImperial"] ||
    choosePreferredUnit(baseValue, def.base, targetSystem);

  const targetDef = UNIT_MAP[targetUnit];
  if (!targetDef) {
    return { quantity, unit }; // fallback
  }

  // Convert base value to target
  const convertedQuantity = targetDef.fromBase(baseValue);

  return {
    quantity: roundToReasonablePrecision(convertedQuantity),
    unit: targetUnit,
  };
}

/**
 * Get the dimension of a unit (weight, volume, count, or null if unknown)
 */
export function getUnitDimension(unit: string): "weight" | "volume" | "count" | "other" | null {
  if (!unit) return null;
  const normalizedUnit = unit.toLowerCase();
  const def = UNIT_MAP[normalizedUnit];
  return def?.dimension ?? null;
}

/**
 * Check if two units have compatible dimensions (can be compared/converted)
 * E.g., g and kg are compatible (both weight), ml and g are not (volume vs weight)
 */
export function areDimensionsCompatible(unit1: string, unit2: string): boolean {
  const dim1 = getUnitDimension(unit1);
  const dim2 = getUnitDimension(unit2);

  // If either dimension is unknown, treat as incompatible
  if (dim1 === null || dim2 === null) return false;

  // Count units should only match with count units
  return dim1 === dim2;
}

/**
 * Convert a quantity to its base unit value (g for weight, ml for volume)
 * Returns the raw value in base units for accurate comparison
 */
export function convertToBaseUnit(quantity: number, unit: string): number {
  if (quantity == null || isNaN(quantity) || !unit) {
    return quantity;
  }

  const normalizedUnit = unit.toLowerCase();
  const def = UNIT_MAP[normalizedUnit];
  if (!def) {
    // Unknown unit: return as-is
    return quantity;
  }

  return def.toBase(quantity);
}
