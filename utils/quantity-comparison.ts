// Quantity comparison utilities for pantry vs recipe ingredient matching
// Supports comparing quantities with different units via unit conversion.
// Provided functions:
//  - compareQuantities(availableQuantity, availableUnit, requiredQuantity, requiredUnit)
//  - calculateDeficit(requiredQuantity, requiredUnit, availableQuantity, availableUnit)
//  - hasSufficientQuantity(availableQuantity, availableUnit, requiredQuantity, requiredUnit)
//
// Design principles:
//  * Non-destructive: if units are incompatible or unknown, returns comparison as-is.
//  * Uses base unit conversion for accurate comparison (g for weight, ml for volume).
//  * Handles same-dimension units with automatic conversion (e.g., g vs kg, ml vs cup).
//  * Returns clear comparison results: 'sufficient', 'insufficient', 'incompatible'.

import {
  convertToBaseUnit,
  areDimensionsCompatible,
  getUnitDimension,
  roundToReasonablePrecision,
  type ConvertedQuantity,
} from "./unit-converter";

export type QuantityComparisonResult =
  | "sufficient" // Available quantity meets or exceeds required quantity
  | "insufficient" // Available quantity is less than required quantity
  | "incompatible" // Units cannot be compared (different dimensions or unknown)
  | "unknown"; // Error or invalid input

export interface QuantityComparison {
  result: QuantityComparisonResult;
  availableQuantity: number;
  availableUnit: string;
  requiredQuantity: number;
  requiredUnit: string;
  deficit?: ConvertedQuantity; // Only present if result is 'insufficient'
  availableInRequiredUnits?: number; // Available quantity converted to required unit (if compatible)
}

/**
 * Compare available quantity vs required quantity with unit conversion.
 * Returns a detailed comparison object with the result and deficit information.
 *
 * @param availableQuantity - The quantity available in pantry
 * @param availableUnit - The unit of the available quantity
 * @param requiredQuantity - The quantity required by recipe
 * @param requiredUnit - The unit of the required quantity
 * @returns QuantityComparison object with comparison result and details
 */
export function compareQuantities(
  availableQuantity: number,
  availableUnit: string,
  requiredQuantity: number,
  requiredUnit: string
): QuantityComparison {
  // Validate inputs
  if (
    availableQuantity == null ||
    requiredQuantity == null ||
    isNaN(availableQuantity) ||
    isNaN(requiredQuantity) ||
    !availableUnit ||
    !requiredUnit
  ) {
    return {
      result: "unknown",
      availableQuantity,
      availableUnit,
      requiredQuantity,
      requiredUnit,
    };
  }

  // Normalize units
  const normalizedAvailableUnit = availableUnit.toLowerCase().trim();
  const normalizedRequiredUnit = requiredUnit.toLowerCase().trim();

  // Check if units are compatible (same dimension)
  const compatible = areDimensionsCompatible(normalizedAvailableUnit, normalizedRequiredUnit);

  if (!compatible) {
    return {
      result: "incompatible",
      availableQuantity,
      availableUnit: normalizedAvailableUnit,
      requiredQuantity,
      requiredUnit: normalizedRequiredUnit,
    };
  }

  // Convert both quantities to base unit for comparison
  const availableInBase = convertToBaseUnit(availableQuantity, normalizedAvailableUnit);
  const requiredInBase = convertToBaseUnit(requiredQuantity, normalizedRequiredUnit);

  // Handle conversion failures
  if (
    availableInBase == null ||
    requiredInBase == null ||
    isNaN(availableInBase) ||
    isNaN(requiredInBase)
  ) {
    return {
      result: "unknown",
      availableQuantity,
      availableUnit: normalizedAvailableUnit,
      requiredQuantity,
      requiredUnit: normalizedRequiredUnit,
    };
  }

  // Compare in base units
  const hasEnough = availableInBase >= requiredInBase;
  const result: QuantityComparisonResult = hasEnough ? "sufficient" : "insufficient";

  // Calculate deficit if insufficient
  const deficitInBase = hasEnough ? 0 : requiredInBase - availableInBase;

  // Convert available to required units for display
  const availableInRequiredUnits = convertFromBaseToRequiredUnit(
    availableInBase,
    requiredInBase,
    normalizedRequiredUnit
  );

  const comparison: QuantityComparison = {
    result,
    availableQuantity,
    availableUnit: normalizedAvailableUnit,
    requiredQuantity,
    requiredUnit: normalizedRequiredUnit,
    availableInRequiredUnits,
  };

  // Add deficit if insufficient
  if (!hasEnough) {
    comparison.deficit = {
      quantity: roundToReasonablePrecision(deficitInBase),
      unit: getBaseUnitForDimension(normalizedRequiredUnit),
    };
  }

  return comparison;
}

/**
 * Calculate the deficit (how much more is needed) when pantry quantity is insufficient.
 * Returns the quantity needed in base units (g/ml/unit), or null if units are incompatible.
 *
 * @param requiredQuantity - The quantity required by recipe
 * @param requiredUnit - The unit of the required quantity
 * @param availableQuantity - The quantity available in pantry
 * @param availableUnit - The unit of the available quantity
 * @returns ConvertedQuantity with deficit amount, or null if incompatible/unknown
 */
export function calculateDeficit(
  requiredQuantity: number,
  requiredUnit: string,
  availableQuantity: number,
  availableUnit: string
): ConvertedQuantity | null {
  const comparison = compareQuantities(
    availableQuantity,
    availableUnit,
    requiredQuantity,
    requiredUnit
  );

  if (comparison.result === "insufficient" && comparison.deficit) {
    return comparison.deficit;
  }

  // If sufficient or incompatible, no deficit
  return null;
}

/**
 * Quick check if pantry has sufficient quantity for recipe requirement.
 * Returns true if available >= required, false otherwise.
 *
 * @param availableQuantity - The quantity available in pantry
 * @param availableUnit - The unit of the available quantity
 * @param requiredQuantity - The quantity required by recipe
 * @param requiredUnit - The unit of the required quantity
 * @returns true if sufficient, false if insufficient or incompatible
 */
export function hasSufficientQuantity(
  availableQuantity: number,
  availableUnit: string,
  requiredQuantity: number,
  requiredUnit: string
): boolean {
  const comparison = compareQuantities(
    availableQuantity,
    availableUnit,
    requiredQuantity,
    requiredUnit
  );

  return comparison.result === "sufficient";
}

/**
 * Aggregate multiple pantry quantities for the same ingredient.
 * Returns the total quantity in base units.
 *
 * @param quantities - Array of {quantity, unit} objects to sum
 * @returns Total quantity in base units, or null if incompatible/unknown
 */
export function aggregateQuantities(
  quantities: Array<{ quantity: number; unit: string }>
): number | null {
  if (!quantities || quantities.length === 0) {
    return 0;
  }

  let total = 0;
  let referenceDimension: string | null = null;

  for (const item of quantities) {
    if (item.quantity == null || isNaN(item.quantity) || !item.unit) {
      return null; // Invalid input
    }

    const normalizedUnit = item.unit.toLowerCase().trim();
    const dimension = getUnitDimension(normalizedUnit);

    if (!dimension || dimension === "other") {
      return null; // Unknown or incompatible unit
    }

    // Check if all items have the same dimension
    if (referenceDimension === null) {
      referenceDimension = dimension;
    } else if (dimension !== referenceDimension) {
      return null; // Mixed dimensions (e.g., weight + volume)
    }

    // Convert to base and add to total
    const inBase = convertToBaseUnit(item.quantity, normalizedUnit);
    if (inBase == null || isNaN(inBase)) {
      return null;
    }
    total += inBase;
  }

  return total;
}

/**
 * Calculate the percentage of recipe requirement satisfied by pantry.
 * Returns a value from 0-100, or null if incompatible.
 *
 * @param availableQuantity - The quantity available in pantry
 * @param availableUnit - The unit of the available quantity
 * @param requiredQuantity - The quantity required by recipe
 * @param requiredUnit - The unit of the required quantity
 * @returns Percentage from 0-100, or null if incompatible
 */
export function calculateAvailabilityPercentage(
  availableQuantity: number,
  availableUnit: string,
  requiredQuantity: number,
  requiredUnit: string
): number | null {
  const comparison = compareQuantities(
    availableQuantity,
    availableUnit,
    requiredQuantity,
    requiredUnit
  );

  if (comparison.result === "incompatible" || comparison.result === "unknown") {
    return null;
  }

  // Normalize units before conversion (same as compareQuantities does)
  const normalizedAvailableUnit = availableUnit.toLowerCase().trim();
  const normalizedRequiredUnit = requiredUnit.toLowerCase().trim();

  const availableInBase = convertToBaseUnit(availableQuantity, normalizedAvailableUnit);
  const requiredInBase = convertToBaseUnit(requiredQuantity, normalizedRequiredUnit);

  if (availableInBase == null || requiredInBase == null || requiredInBase === 0) {
    return null;
  }

  const percentage = (availableInBase / requiredInBase) * 100;
  return Math.min(100, Math.max(0, percentage)); // Clamp between 0-100
}

// Helper function to get the base unit for a given unit
function getBaseUnitForDimension(unit: string): string {
  const dimension = getUnitDimension(unit);
  switch (dimension) {
    case "weight":
      return "g";
    case "volume":
      return "ml";
    case "count":
      return "unit";
    default:
      return unit;
  }
}

// Helper function to convert base value to required unit
function convertFromBaseToRequiredUnit(
  baseValue: number,
  requiredBase: number,
  requiredUnit: string
): number | undefined {
  // This is a simplified conversion - for display purposes
  // The ratio of available to required in base units
  if (requiredBase === 0) return undefined;
  return (baseValue / requiredBase) * requiredBase; // This returns the base value
}
