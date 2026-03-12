/**
 * Waste Metrics Calculation Verification Tests
 *
 * This file contains manual verification tests for waste metrics calculations.
 * Run these tests manually to ensure calculation accuracy.
 *
 * To verify: Check the analytics screen with known waste log values
 */

import { WasteStats } from "../WasteLogRepository";

// CO2 Conversion Factor (must match analytics.tsx)
const CO2_CONVERSION_FACTOR = 2.5; // 1kg food waste = 2.5kg CO2 equivalent

/**
 * Test Case 1: Basic Summation Verification
 *
 * Setup:
 * 1. Create 3 waste log entries:
 *    - Entry 1: quantity=2kg, cost=500 cents ($5)
 *    - Entry 2: quantity=3kg, cost=1000 cents ($10)
 *    - Entry 3: quantity=1.5kg, cost=300 cents ($3)
 *
 * Expected Results:
 * - totalWasteEntries: 3
 * - totalQuantityWasted: 6.5 kg
 * - totalEstimatedCost: 1800 cents ($18)
 * - averageWastePerEntry: 2.167 kg
 * - moneyWasted: $18.00 (after /100 conversion)
 * - co2FromWaste: 16.25 kg (6.5 * 2.5)
 */
export const testCase1_BasicSummation = {
  inputs: [
    { quantity: 2, cost: 500 },
    { quantity: 3, cost: 1000 },
    { quantity: 1.5, cost: 300 },
  ],
  expected: {
    totalWasteEntries: 3,
    totalQuantityWasted: 6.5,
    totalEstimatedCost: 1800,
    averageWastePerEntry: 2.167,
    moneyWasted: 18.0,
    co2FromWaste: 16.25,
  },
};

/**
 * Test Case 2: CO2 Conversion Verification
 *
 * Setup:
 * 1. Create waste log with totalQuantityWasted = 10 kg
 *
 * Expected Results:
 * - co2FromWaste: 25 kg (10 * 2.5)
 *
 * Verification:
 * - Check analytics screen shows "25kg" CO2
 */
export const testCase2_CO2Conversion = {
  inputs: {
    totalQuantityWasted: 10,
  },
  expected: {
    co2FromWaste: 25,
  },
  formula: "totalQuantityWasted * CO2_CONVERSION_FACTOR",
};

/**
 * Test Case 3: Money Conversion Verification
 *
 * Setup:
 * 1. Create waste logs totaling 2500 cents
 *
 * Expected Results:
 * - moneyWasted: $25.00 (2500 / 100)
 *
 * Verification:
 * - Check analytics screen shows "$25" (with Intl.NumberFormat)
 */
export const testCase3_MoneyConversion = {
  inputs: {
    totalEstimatedCost: 2500,
  },
  expected: {
    moneyWasted: 25.0,
  },
  formula: "totalEstimatedCost / 100",
};

/**
 * Test Case 4: Empty State Verification
 *
 * Setup:
 * 1. No waste log entries
 *
 * Expected Results:
 * - All metrics show 0
 * - No division by zero errors
 */
export const testCase4_EmptyState = {
  inputs: {
    entries: [],
  },
  expected: {
    totalWasteEntries: 0,
    totalQuantityWasted: 0,
    totalEstimatedCost: 0,
    averageWastePerEntry: 0,
    moneyWasted: 0,
    co2FromWaste: 0,
    currentStreak: 0, // Or days since epoch
    longestStreak: 0, // Or days since epoch
  },
};

/**
 * Test Case 5: Achievement Unlocking Verification
 *
 * Setup:
 * 1. Create waste logs meeting criteria:
 *    - 50 total entries
 *    - $150 total cost (15000 cents)
 *    - 100 kg total quantity
 *    - 0 day current streak (waste logged today)
 *    - 0 day longest streak
 *
 * Expected Achievement Status:
 * - Waste Warrior: UNLOCKED (totalWasteEntries > 0)
 * - Zero Waste Week: LOCKED (currentStreak < 7)
 * - Money Saver: UNLOCKED (totalMoneyWasted >= $100)
 * - Eco Hero: UNLOCKED (totalCO2FromWaste = 250kg >= 50kg)
 * - Streak Master: LOCKED (longestStreak < 30)
 */
export const testCase5_AchievementUnlocking = {
  inputs: {
    totalWasteEntries: 50,
    totalEstimatedCost: 15000,
    totalQuantityWasted: 100,
    currentStreak: 0,
    longestStreak: 0,
  },
  calculated: {
    totalMoneyWasted: 150,
    totalCO2FromWaste: 250,
  },
  expectedAchievements: {
    "first-log": true,
    "zero-waste-week": false,
    "money-saver": true,
    "eco-hero": true,
    "streak-master": false,
  },
};

/**
 * Test Case 6: Streak Calculation Verification
 *
 * Scenario A: No waste ever
 * - currentStreak: Days since epoch (very large number)
 * - longestStreak: Days since epoch
 *
 * Scenario B: Waste logged today
 * - currentStreak: 0 (broken today)
 * - longestStreak: Days before first waste
 *
 * Scenario C: Waste 5 days ago, nothing since
 * - currentStreak: 5 (5 clean days)
 * - longestStreak: max(previous streaks, 5)
 *
 * Scenario D: Waste every day for a week
 * - currentStreak: 0
 * - longestStreak: Days before first waste streak
 */
export const testCase6_StreakCalculation = {
  scenarioA: {
    description: "No waste ever logged",
    inputs: { wasteDates: [] },
    expected: {
      currentStreak: "days since epoch",
      longestStreak: "days since epoch",
    },
  },
  scenarioB: {
    description: "Waste logged today",
    inputs: {
      wasteDates: [Date.now()],
    },
    expected: {
      currentStreak: 0,
      longestStreak: "days before first waste",
    },
  },
  scenarioC: {
    description: "Waste 5 days ago, clean since",
    inputs: {
      wasteDates: [Date.now() - 5 * 24 * 60 * 60 * 1000],
    },
    expected: {
      currentStreak: 5,
      longestStreak: "max of all gaps",
    },
  },
};

/**
 * Manual Verification Checklist
 *
 * Step 1: Setup Test Data
 * [ ] Open the app
 * [ ] Navigate to an ingredient detail
 * [ ] Log 3 waste items with known values
 *
 * Step 2: Verify Display Metrics
 * [ ] Items Wasted shows correct count
 * [ ] Money Wasted shows correct USD amount
 * [ ] CO2 Impact shows correct kg (with 2.5x conversion)
 *
 * Step 3: Verify Chart Data
 * [ ] Waste trend chart displays
 * [ ] Chart values match totals
 * [ ] Time period filtering works
 *
 * Step 4: Verify Achievements
 * [ ] Achievements unlock at correct thresholds
 * [ ] Progress bars show accurate values
 * [ ] Visual feedback for unlocked/locked state
 *
 * Step 5: Verify Streaks
 * [ ] Current streak displays correctly
 * [ ] Longest streak calculates correctly
 * [ ] Streaks update when new waste is logged
 *
 * Step 6: Verify Repository Calculations
 * [ ] getWasteStats returns all fields
 * [ ] Aggregations (sum, avg) are accurate
 * [ ] Grouping by reason works
 * [ ] Most wasted items sorting works
 */
export const verificationChecklist = {
  testDataSetup: false,
  displayMetrics: false,
  chartData: false,
  achievements: false,
  streaks: false,
  repositoryCalculations: false,
};

/**
 * Quick Calculation Helper
 *
 * Use this to manually verify expected values
 */
export function calculateExpectedMetrics(
  entries: Array<{ quantity: number; cost: number }>
): {
  totalWasteEntries: number;
  totalQuantityWasted: number;
  totalEstimatedCost: number;
  averageWastePerEntry: number;
  moneyWasted: number;
  co2FromWaste: number;
} {
  const totalWasteEntries = entries.length;
  const totalQuantityWasted = entries.reduce((sum, e) => sum + e.quantity, 0);
  const totalEstimatedCost = entries.reduce((sum, e) => sum + e.cost, 0);
  const averageWastePerEntry =
    totalWasteEntries > 0 ? totalQuantityWasted / totalWasteEntries : 0;
  const moneyWasted = totalEstimatedCost / 100;
  const co2FromWaste = totalQuantityWasted * CO2_CONVERSION_FACTOR;

  return {
    totalWasteEntries,
    totalQuantityWasted,
    totalEstimatedCost,
    averageWastePerEntry,
    moneyWasted,
    co2FromWaste,
  };
}

export default {
  testCase1_BasicSummation,
  testCase2_CO2Conversion,
  testCase3_MoneyConversion,
  testCase4_EmptyState,
  testCase5_AchievementUnlocking,
  testCase6_StreakCalculation,
  verificationChecklist,
  calculateExpectedMetrics,
};
