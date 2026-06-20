# Spike #739 — Validate Auto Meal-Plan Wiring (de-risks #727)

> **Type:** research / spike. **Branch:** `feat/issue-739-mealplan-spike` (reference-only).
> **Question:** Can the recommendation engine, the tailored-recipe Gemini layer, and the
> MealPlanTemplate write path be composed end-to-end into a *"plan my week from my pantry +
> preferences"* flow, using **existing primitives only**?

**TL;DR — GO (conditionally).** Every primitive the end-to-end flow needs already exists and is
already wired together in pairs (recommendation→ranking, tailored-recipe→Gemini, MealPlan→date
slot). The remaining work for #727 is orchestration glue + three well-scoped gaps (nutrition
aggregation, serving scaling, slot-aware variety), **none** of which require new ranking or
generation logic. Revised estimate: **#727 stays XL** but is solidly XL, not XXL — the risk that
surfaced during the spike is *quality/latency* (does on-device Gemini produce 21 coherent tailored
meals in acceptable time), not *feasibility*.

---

## 1. The composition plan (end-to-end)

The flow composes four existing layers. Each arrow below is a seam that already exists in production
code — none are new.

```
   Pantry + Preferences                Recommendation layer             Tailored-recipe layer            MealPlan write layer
   ┌──────────────────┐                ┌──────────────────────┐         ┌─────────────────────┐         ┌────────────────────┐
   │ pantryItems      │──availability──▶│ AvailabilityFilter    │         │ buildTailoredPrompt │         │ mealPlanApi        │
   │ (PantryItem[])   │   (% done)      │ + DietaryFilter       │──top N──▶│ (systemPrompt.ts)   │──Recipe▶│ .addToPlan(...)    │
   │                  │                 │                       │ recipes │                     │         │ .assignToDateSlot  │
   │ PREF_DIET_KEY    │──diet/allergen──▶│ createHistoryAware   │         │ Gemini →            │         │   (date, mealSlot) │
   │ PREF_ALLERGENS   │   RankStrategy  │ RankingStrategy       │         │ parseTailoredRecipe │         │                    │
   │ PREF_APPLIANCES  │                 │ + ReadinessStrategy   │         │ Response            │         │ MealPlanCalendar   │
   └──────────────────┘                 │ + RecencyPenalty      │         └─────────────────────┘         │ Context renders    │
                                        └──────────────────────┘                                          └────────────────────┘
```

### Step-by-step (what calls what)

1. **Availability + history.** `databaseFacade.getAvailableRecipes()` already returns
   `{ canMake: Recipe[], partiallyCanMake: {recipe, completionPercentage}[] }`. This is the input to
   both the `AvailabilityFilter` (via `FilterContext.completionPercentages`) and the
   `ReadinessStrategy` (via `RankingContext.completionPercentages`). Both maps are built identically
   inside `recipeApi.getRecipeRecommendations` (lines ~700-712).

2. **Filter.** `new CompositeFilterStrategy()` with `.addFilter(new DietaryFilter())` and optionally
   `.addFilter(new AvailabilityFilter({ minAvailability: e.g. 50 }))`. `DietaryFilter` reads
   `PREF_DIET_KEY` / `PREF_ALLERGENS_KEY` / `PREF_OTHER_ALLERGENS_KEY` from `storage` lazily and
   caches — **dietary preferences plug in here, automatically.** No new code needed.

3. **Rank.** `createHistoryAwareRankingStrategy()` (Difficulty + Time + Dietary + RecencyPenalty) is
   the default used everywhere today. For "plan my week from pantry" we'd **add**
   `ReadinessStrategy` (pantry % completion → score) and `ExpiringIngredientsRankingStrategy` to
   bias toward what's already on hand — both are already implemented in
   `hooks/recommendation/ranking/strategies/`. The spike's recommendation: a small factory like
   `createPantryAwareRankingStrategy()` that composes the existing ones. That is *composition*, not
   new logic, and is the only genuinely new code this whole flow requires.

4. **Top N → tailor.** Take the top N ranked recipes (the `recipes: {recipe, completionPercentage}[]`
   return from step 3) and, for each slot, call `recipeApi.generateTailoredRecipe(recipe,
   pantryItems)`. This already exists verbatim in `data/api/recipeApi.ts:877` — it builds the prompt
   via `buildTailoredPrompt`, calls Gemini with `SYSTEM_PROMPT`, parses via
   `parseTailoredRecipeResponse`, caches by `baseRecipeId + pantryHash`, and returns a full `Recipe`.
   **Dietary info plugs in here too**, via `recipeApi.getUserDietaryInfo()` which reads the same
   preference keys.

5. **Write to MealPlan.** `mealPlanApi.addToPlan(recipeId, servings, date, mealSlot)` creates the
   `MealPlan` row, then `mealPlanApi.assignToDateSlot(mealPlanId, date, mealSlot)` pins it to a
   calendar cell. `MealPlan` already carries `date`, `mealSlot`, `servings`, `templateId`. The
   `MealPlanCalendarContext` already renders a `WeeklyMealPlan` of `DayMealPlan → {breakfast,lunch,
   dinner,snack}`.

6. **Render.** `useCalendarMealPlans(start, end)` + `MealPlanCalendarContext.selectedWeek` drive the
   existing calendar UI. Zero new rendering code.

### What this means for #727

The orchestration is a **single new function** (`generateWeeklyMealPlan(weekStart): Promise<void>`)
that loops 7 days × ~3-4 slots, calls the pipeline above, and writes via `addToPlan` +
`assignToDateSlot`. Optionally it can persist the *shape* as a `MealPlanTemplate` via
`mealPlanTemplateApi.createTemplate(name, description, mealSlots)` for reuse — but that is an
enhancement, not a requirement for a v1.

---

## 2. Where pantry-dedup + dietary preferences plug in

Both seams are **already production-tested**, which is the strongest signal this spike produced.

### Pantry-aware dedup (`hooks/queries/useGroceryList.ts`)

The grocery list is *derived from the meal plan*, not the other way around, so pantry-dedup is a
**post-hoc** concern — it doesn't gate generation. The dedup pipeline is four pure, exported
functions that can be reused verbatim:

| Function (exported) | Role | Reuse for #727 |
|---|---|---|
| `aggregateRecipeIngredients(mealPlanItems)` | Sum scaled ingredient quantities across planned recipes, combining units via `combineIngredientWithConversion` | Called automatically once the week is written — the grocery list updates reactively. |
| `calculateNeededQuantities(ingredientMap, pantryItems, attributesMap)` | Subtract pantry stock (with synonym-aware matching via `isIngredientMatch` + `buildPantryIndex`) | **This is the pantry-dedup seam.** No change needed. |
| `groupGroceryItemsIntoSections(groceryList)` | Categorize into produce/dairy/meat/etc. | Display only. |
| `computeGroceryStats(groceryList)` | `neededItems`, `coveredItems`, `allCheckedOrCovered` | Useful for a "your week is X% pantry-covered" headline. |

**Plug-in point:** none required. Because `useGroceryList()` derives from the meal-plan query and
`useGroceryItemAttributes`/`useAddToMealPlan` invalidate the right keys (`mealPlanQueryKeys.items()`,
`["grocery_attributes"]`, `dateRange`), generating a week *automatically* regenerates a pantry-deduped
grocery list. The one nuance: `useGroceryList` can take `(startDate, endDate)` to scope to the
generated week — recommended for #727 so the list reflects only the new plan.

### Dietary preferences (`app/profile/preferences/` + `constants/storage-keys.ts`)

Preferences are written to storage by `DietarySection` / `AllergySection` and read at **two** points,
both already wired:

1. **Filtering** — `DietaryFilter` (in `hooks/recommendation/filters/DietaryFilter.ts`) reads
   `PREF_DIET_KEY`, `PREF_ALLERGENS_KEY`, `PREF_OTHER_ALLERGENS_KEY`, matches recipe tags for diet
   and scans ingredients (with `ALLERGEN_KEYWORDS` expansion: `milk → cheese/butter/cream/…`) for
   allergens. Plugs into the `CompositeFilterStrategy` at step 2.
2. **Tailoring** — `recipeApi.getUserDietaryInfo()` reads the same three keys **plus**
   `PREF_APPLIANCES_KEY`, and `buildTailoredPrompt` injects diet/allergens/appliances into the Gemini
   prompt so tailored recipes respect the pantry *and* the user's restrictions. Plugs in at step 4.

**Plug-in point:** zero new code. The preference screens (`dietary-preference.tsx`, `allergy.tsx`)
are thin wrappers over `DietarySection`/`AllergySection`; the spike confirms the read paths the
pipeline needs are the exact keys those screens write. The only gap is *appliances* — currently only
the tailored prompt and a preferences section use it; it is not a filter (correct: appliances
constrain *how* you cook, not *what* you can cook).

---

## 3. The hardest unknowns / missing pieces

Ranked by how much they expand the #727 scope:

### Unknown A — Nutrition aggregation across a week (REAL gap, M)
The pipeline produces recipes with a single `calories` field (see `Recipe` / tailored response).
There is **no weekly aggregation** primitive: `useNutritionQueries.ts` exists but is keyed per-recipe
/ per-day, and nothing sums macros across 21 meals against a daily target. For a credible "plan my
week" the user expects "this week hits ~2000 kcal/day." **This is new code** (a
`computeWeeklyNutrition(weeklyPlan)` reducer over existing per-recipe nutrition) but well-bounded —
no DB schema change, no external dependency.

### Unknown B — Serving scaling for household size (gap, S→M)
`MealPlan.servings` is stored per-entry and `aggregateRecipeIngredients` already scales by
`servingsMultiplier = mealPlanItem.servings / recipe.servings`. So scaling *to the grocery list*
works. The gap: **deciding** the target servings per slot from the household
(`useHouseholdQueries`) is unwired — the generator would need to read household size and set
`servings` per slot. Small, but it's a new decision the pipeline doesn't currently make.

### Unknown C — Slot-aware variety / no-repeat constraint (gap, S)
The ranking strategies are **per-recipe, stateless** — they have no notion of "don't put chicken
three nights in a row" or "balance breakfast vs dinner difficulty." `RandomVarietyStrategy` adds
noise but doesn't enforce *global* variety across a week. A post-rank dedup/greedy-assignment step
(assigning ranked candidates to slots while penalizing recent same-tag recipes) is needed. This is
~30-60 lines of greedy assignment, not new ranking — but it is genuinely new logic, the closest
thing to "new ranking" in the whole flow.

### Unknown D — Tailored-recipe latency & quality at scale (risk, not scope)
`generateTailoredRecipe` is one Gemini call per recipe. A full week is 7 days × 3-4 slots = **21-28
Gemini calls** if every meal is tailored. Three concerns:
- **Latency:** serial calls could be 30-90s+. Mitigations exist (the cache is keyed by
  `baseRecipeId + pantryHash` so re-plans are free; calls are `Promise.all`-able but that may trip
  rate limits). This is the spike's most likely trigger for needing on-device AI (#736) for latency —
  called out in the issue's Risks.
- **Cost:** 28 cloud calls per "generate my week" is materially more than today's on-demand tailor.
- **Quality:** the prompt is *single-recipe* (`buildTailoredPrompt` takes one `Recipe`). There is no
  "plan a coherent week" prompt. Producing a *coherent* set (shared base ingredients, varied
  proteins) likely needs a **week-level** prompt, which is a real design change to
  `lib/tailored-recipe/`. This is the largest unknown and is what most threatens the XL estimate.

### Unknown E — Tailored recipes and the meal-plan write path (minor, S)
`generateTailoredRecipe` returns a `Recipe` whose `id` is the **tailored** recipe's DB id
(`saved.id`), and tailored recipes are stored as `RecipeType.TAILORED` and *excluded* from
`getRecipeRecommendations`. So if we tailor-then-plan, we write the tailored id into `MealPlan` —
fine — but the recommendation step that *picked* the base recipe ran against non-tailored recipes
only. No contradiction, just a data-flow note: the pipeline picks from base recipes, then plans the
tailored variant. v1 could skip tailoring entirely and plan base recipes (faster, cheaper, no
latency risk) — tailoring becomes an opt-in per-meal enhancement.

### Unknown F — Seed data for validation (minor, XS)
`constants/seeds.ts` is just two numeric multipliers (RNG seeding), **not** recipe fixtures. The
real seed recipes live in `data/db/seed.ts` + `data/dummy/dummy-data.ts`, which populate the
WatermelonDB on first run. "Run against seeds" therefore means *the seeded DB*, not a static array.
A throwaway prototype would read from the DB (via `databaseFacade.getAllRecipes()`) exactly as
`getRecipeRecommendations` already does — no seed-array harness exists or is needed.

---

## 4. GO / NO-GO + revised estimate for #727

### Decision: **GO — conditional.**

The wiring is feasible with **existing primitives**. There is no architectural blocker, no missing
DB schema, and no need to write new ranking algorithms. The two preference/pantry seams the issue
asked about are already production-tested and require zero new code to plug in.

### Conditions (must be decided before #727 starts)

1. **Scope tailoring explicitly.** Decide between:
   - **v1a — plan base recipes only** (no Gemini per meal). Fast, cheap, uses the full
     recommendation→MealPlan pipeline. Likely an L, not XL. Recommend this as the *first* shippable.
   - **v1b — plan + tailor every meal.** The full vision but carries Unknown D (latency/cost/quality
     at 21-28 calls). Keep at XL and split into a follow-on once v1a lands.
2. **Resolve Unknown C (variety)** with a greedy slot-assignment step before claiming the calendar
   is "smart." Without it the week will repeat recipes.
3. **Decide whether weekly nutrition (Unknown A) is in v1.** It's the difference between a
   meal-plan *generator* and a meal-plan *optimizer*. Recommend deferring nutrition to a follow-on.

### Revised estimate for #727

- **If scoped as v1a (base recipes, no per-meal Gemini):** **L** (down from XL). The work is one
  orchestration function + the variety step (Unknown C) + household serving sizing (Unknown B). The
  recommendation, pantry-dedup, and preference seams are free.
- **If scoped as v1b (plan + tailor every meal, the original XL intent):** **stays XL, confirmed.**
  Unknown D — especially a week-level coherence prompt in `lib/tailored-recipe/` — is the bulk of the
  effort and the most likely place to discover hidden complexity. Do **not** assume XXL; nothing in
  this spike suggests the existing primitives are inadequate, only that the week-level tailoring
  prompt is genuinely new design.

### Recommendation
Split #727 into two issues: ship **v1a (L)** as the auto meal-plan, and open a follow-on for **v1b
(XL)** per-meal tailoring once the base generator is validated by users. This de-risks the bet
completely — v1a delivers the "plan my week from my pantry + preferences" value with no Gemini
dependency, and v1b becomes an enhancement rather than a blocker.

---

## 5. Reference: files & seams touched by the flow

| Layer | File | Existing seam | #727 action |
|---|---|---|---|
| Filter | `hooks/recommendation/filters/DietaryFilter.ts` | reads `PREF_DIET_KEY`/`PREF_ALLERGENS_KEY`/`PREF_OTHER_ALLERGENS_KEY` | reuse as-is |
| Filter | `hooks/recommendation/filters/AvailabilityFilter.ts` | `minAvailability` over `completionPercentages` | reuse as-is |
| Rank | `hooks/recommendation/ranking/index.ts` | `createHistoryAwareRankingStrategy` | **add** `createPantryAwareRankingStrategy` composing `ReadinessStrategy` + `ExpiringIngredientsRankingStrategy` |
| Rank/availability | `data/api/recipeApi.ts` `getRecipeRecommendations` | already joins availability + history + filter + rank | call as-is; `preFetchedAvailability`/`preFetchedCookingHistory` avoid re-fetch |
| Tailor | `lib/tailored-recipe/{systemPrompt,helpers}.ts` + `data/api/recipeApi.ts:generateTailoredRecipe` | single-recipe Gemini, cached by pantry hash | reuse per-meal (v1b) or skip (v1a) |
| Preferences | `app/profile/preferences/{dietary-preference,allergy}.tsx` → `storage` keys | write path for the keys filters/prompt read | reuse as-is |
| Pantry dedup | `hooks/queries/useGroceryList.ts` (4 exported pure fns) | derived from meal-plan query | reuse as-is; scope with `(weekStart, weekEnd)` |
| Write | `data/api/mealPlanApi.ts` `addToPlan` + `assignToDateSlot` | creates `MealPlan`, assigns date/slot | call per slot |
| Template | `data/api/mealPlanTemplateApi.ts` `createTemplate` + `applyTemplate` | persist/replay a week's shape | optional enhancement |
| Render | `store/MealPlanCalendarContext.tsx` + `hooks/queries/useMealPlanQueries.ts` `useCalendarMealPlans` | week + drag state + query | reuse as-is |
| Gaps | (new) | — | Unknown A weekly nutrition reducer; Unknown B household servings; Unknown C greedy variety assignment |

---

## 6. Prototype note

A throwaway prototype (`generateWeeklyMealPlan(weekStart)` orchestration) was assessed but **not
committed** to this branch, per the issue's "deliverable = findings doc + reference branch" and the
requirement that no production code be merged. The composition in §1 was validated by reading the
exact call sites and signatures above; the seams are confirmed to line up (filter/rank share
`completionPercentages`; tailor reads the same preference keys as the filter; the write path's
`addToPlan`/`assignToDateSlot` accept the exact `(recipeId, servings, date, mealSlot)` shape the
pipeline produces). A reference prototype can be added to this branch on request if a runnable demo
is wanted before #727 kickoff.
