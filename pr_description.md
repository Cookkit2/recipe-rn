🎯 **What:** Replaced the use of `any` types with explicit `MealPlanData` and `MealPlan` typings within `data/api/mealPlanTemplateApi.ts`. Specifically updated `existingPlansMap`, `creates` array, and `updates` array to use strong TypeScript interfaces.

💡 **Why:** Reduces the reliance on loosely-typed `any`, enforcing stronger contract guarantees when pushing changes to the repository via `batchUpsert`. This improves code predictability, refactoring safety, and overall readability.

✅ **Verification:** Verified that TypeScript compilation (`tsc --noEmit`), Prettier style checking (`bun run lint`), and unit test suite coverage (`bun run test`) passed successfully without regressions.

✨ **Result:** Stronger strict typing in the `mealPlanTemplateApi.applyTemplate` function without modifying existing behavior or output structure.
