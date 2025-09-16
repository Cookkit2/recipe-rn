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

export type UnitSystem = "si" | "imperial";

export interface ConvertedQuantity {
  quantity: number;
  unit: string;
}

interface UnitDef {
  system: UnitSystem;
  base: string; // canonical SI base unit for dimension (e.g., g, ml)
  toBase: (v: number) => number; // convert from this unit to base
  fromBase: (v: number) => number; // convert from base to this unit
  dimension: "weight" | "volume" | "count" | "other";
  // Preferred target unit when converting to opposite system at human scale
  prefer?: {
    toSI?: string;
    toImperial?: string;
  };
}

// Constants
const OZ_IN_G = 28.349523125; // 1 oz in g
const LB_IN_G = 453.59237; // 1 lb in g
const ML_IN_FL_OZ = 29.5735295625; // 1 US fl oz in ml
const QT_IN_L = 0.946352946; // 1 US quart in liters
const GAL_IN_L = 3.785411784; // 1 US gallon in liters

// Registry of supported units
const UNIT_MAP: Record<string, UnitDef> = {
  // Weight
  g: {
    system: "si",
    base: "g",
    dimension: "weight",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  kg: {
    system: "si",
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
    prefer: { toSI: "g" },
  },
  lb: {
    system: "imperial",
    base: "g",
    dimension: "weight",
    toBase: (v) => v * LB_IN_G,
    fromBase: (v) => v / LB_IN_G,
    prefer: { toSI: "kg" },
  },

  // Volume
  ml: {
    system: "si",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  l: {
    system: "si",
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
    prefer: { toSI: "ml" },
  },
  qt: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * QT_IN_L * 1000,
    fromBase: (v) => v / (QT_IN_L * 1000),
    prefer: { toSI: "l" },
  },
  gal: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * GAL_IN_L * 1000,
    fromBase: (v) => v / (GAL_IN_L * 1000),
    prefer: { toSI: "l" },
  },
  gallon: {
    system: "imperial",
    base: "ml",
    dimension: "volume",
    toBase: (v) => v * GAL_IN_L * 1000,
    fromBase: (v) => v / (GAL_IN_L * 1000),
    prefer: { toSI: "l" },
  },

  // Count / others (won't convert)
  unit: {
    system: "si",
    base: "unit",
    dimension: "count",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  pcs: {
    system: "si",
    base: "unit",
    dimension: "count",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
  count: {
    system: "si",
    base: "unit",
    dimension: "count",
    toBase: (v) => v,
    fromBase: (v) => v,
  },
};

// Small helper to choose a human friendly unit when converting
function choosePreferredUnit(
  baseValue: number,
  base: string,
  targetSystem: UnitSystem
): string {
  // Weight logic
  if (base === "g") {
    if (targetSystem === "imperial") {
      // If >= 453g => pounds else ounces
      return baseValue >= LB_IN_G * 0.75 ? "lb" : "oz";
    } else {
      // target SI, decide between g and kg
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
    def.prefer?.[targetSystem === "si" ? "toSI" : "toImperial"] ||
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

// Quick sanity self-test (only in dev env) - can be removed or guarded by NODE_ENV
if (process.env.NODE_ENV === "development") {
  const sample = [
    convertToUnitSystem(1000, "g", "imperial"),
    convertToUnitSystem(2, "kg", "imperial"),
    convertToUnitSystem(16, "oz", "si"),
    convertToUnitSystem(1, "lb", "si"),
    convertToUnitSystem(500, "ml", "imperial"),
    convertToUnitSystem(2, "l", "imperial"),
    convertToUnitSystem(32, "fl_oz", "si"),
    convertToUnitSystem(1, "qt", "si"),
  ];
  // eslint-disable-next-line no-console
  console.log("[unit-converter] sample conversions", sample);
}
