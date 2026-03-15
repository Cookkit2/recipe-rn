# Neverthrow Adoption Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Introduce the `neverthrow` Result-based error-handling pattern into the app’s data/API layer (and related utilities) in a way that is incremental, type-safe, and minimally disruptive to existing call sites.

**Architecture:** Keep the current layered architecture (database facade → data APIs → hooks/UI) but standardize errors in the data/API layer on `Result` types from `neverthrow`. Use thin adapter functions to bridge between legacy APIs that return raw values / throw / `{ success, error }` and the new Result-based functions. Push `try/catch` and logging to a few centralized helpers instead of scattering them across API methods.

**Tech Stack:** TypeScript, React Native/Expo, `neverthrow`, existing `utils/logger`, `utils/api-error-handler`, WatermelonDB, Supabase.

---

I'm using the writing-plans skill to create the implementation plan.

---

## High-Level Phasing

1. **Infrastructure & primitives** – Add `neverthrow`, define shared `Result` aliases and basic domain error types.
2. **Centralized helpers** – Adapt or wrap `utils/api-error-handler` to cooperate cleanly with `neverthrow`.
3. **Pilot migration** – Apply `neverthrow` to a small but important vertical (e.g. recipe import APIs) without changing public surface shapes.
4. **Core API migration** – Introduce Result-based variants for `recipeApi`, `pantryApi`, `mealPlanApi` and gradually update callers.
5. **Testing & documentation** – Add tests around new error paths and document conventions for new code.
6. **Optional advanced phase** – Consider wider adoption (hooks, Supabase APIs, etc.) once the pattern proves itself.

Each task below is written so an executor can implement step-by-step with TDD where practical.

---

### Task 1: Add `neverthrow` and base Result helpers

**Files:**

- Modify: `package.json`
- Create: `utils/result.ts`

**Step 1: Add dependency**

- Run: `npm install neverthrow`
- Expected: `neverthrow` appears in `dependencies` in `package.json`.

**Step 2: Create shared Result helpers**

- In `utils/result.ts`, re-export the key types and constructors:
  - `Result`, `Ok`, `Err` (or `ok`, `err`), plus a small helper alias like `AppResult<T, E = Error> = Result<T, E>`.
  - Keep the file free of domain-specific concerns; it should be a low-level primitive layer.

**Step 3: Optional linting rule (future)**

- (Optional, can be a later PR): Decide whether to add an ESLint rule or convention that encourages using `Result` for new async functions in the data/API layer instead of naked `Promise<T>` + throw.

---

### Task 2: Define domain error types and error taxonomy

**Files:**

- Create: `types/AppError.ts` (or `utils/errors.ts`)

**Step 1: Sketch error categories**

- Define a small, pragmatic set of categories, for example:
  - `InfraError` (network, DB, Supabase, file system, external API).
  - `ValidationError` (invalid input, bad user data).
  - `NotFoundError` (missing DB rows, missing recipe).
  - `ConflictError` (uniqueness/conflict situations).
  - `UnknownError` (fallback when classification fails).

**Step 2: Implement discriminated union types**

- In `types/AppError.ts`:
  - Create a discriminated union like:
    - `type AppError = InfraError | ValidationError | NotFoundError | ConflictError | UnknownError;`
  - Ensure each variant has:
    - `kind` (string literal, e.g. `"infra" | "validation" | ..."`).
    - `message` (user-facing or log-ready text).
    - Optional `cause?: unknown` for underlying low-level error.

**Step 3: Add small helpers**

- Add factory functions like `infraError(message: string, cause?: unknown): InfraError` etc.
- These helpers will be used in later tasks to convert unknown thrown errors into typed `AppError` values in `Result` objects.

---

### Task 3: Integrate `neverthrow` with `utils/api-error-handler`

**Files:**

- Modify: `utils/api-error-handler.ts`
- (Possibly) Create: `utils/api-error-handler.neverthrow.ts` if you prefer to keep old and new in parallel.

**Step 1: Decide coexistence strategy**

- Choose one of:
  - **Option A (preferred, incremental)**: Keep existing `withErrorHandling` / `withErrorLogging` for legacy call sites; add new helpers that work with `Result<AppResult>` and `AppError`.
  - **Option B (aggressive)**: Gradually refactor existing wrappers to internally use `Result` while leaving their public signatures stable for now.
- For this plan, assume **Option A** to avoid large immediate churn.

**Step 2: Add Result-based wrappers**

- In `utils/api-error-handler.ts`, add new helpers such as:
  - `wrapResult<T>(fn: () => Promise<T>, errorMapper?: (e: unknown) => AppError): Promise<AppResult<T, AppError>>`
    - Uses `try/catch` once, converts thrown errors to `AppError` using `errorMapper` or a default classification.
  - Optionally, add:
    - `logAndWrapResult` that both logs via `log.error` and returns a `Result`.

**Step 3: Ensure logging preserves stack traces**

- When logging inside these helpers, log the full `error` object, not just `error.message`, so debugging retains stack traces.

**Step 4: Keep legacy helpers intact**

- Confirm existing `withErrorHandling`, `withErrorLogging`, `withStructuredError`, `withSilentError`, `withWarningHandling`, `withArrayErrorHandling`, `createErrorHandler` remain API-compatible so current call sites are not broken by this task.

---

### Task 4: Pilot migration in `recipeImportApi` (internal only)

**Goal:** Use `neverthrow` internally in `data/api/recipeImportApi.ts` while keeping the external signature (`YouTubeImportResult`, `{ success, error }`) unchanged for now.

**Files:**

- Modify: `data/api/recipeImportApi.ts`

**Step 1: Identify exception-heavy paths**

- Focus on:
  - `importRecipeFromUrl`
  - `importRecipeFromYouTube`
  - `importRecipeFromWebsite`
  - `saveRecipeToDatabase`
  - Helpers like `withImportErrorHandling`

**Step 2: Define internal Result-returning helpers**

- For each complex operation, introduce private helpers, e.g.:
  - `private async function analyzeUrlResult(url: string): Promise<AppResult<AnalyzedUrl, AppError>>`
  - `private async function importFromYouTubeResult(…): Promise<AppResult<YouTubeImportSuccessPayload, AppError>>`
  - `private async function importFromWebsiteResult(…): Promise<AppResult<YouTubeImportSuccessPayload, AppError>>`
- Implement these using `wrapResult` and your domain error factories, not raw `try/catch`.

**Step 3: Adapt public functions to use Results internally**

- In `importRecipeFromUrl`, `importRecipeFromYouTube`, `importRecipeFromWebsite`:
  - Replace the bulk of the logic with calls to the new `Result` helpers.
  - Pattern:
    - Call `const res = await importFromYouTubeResult(...);`
    - If `res.isErr()` (or `!res.ok` depending on API), log and convert to `{ success: false, error: res.error.message }`.
    - If `res.isOk()`, convert `res.value` to the existing `YouTubeImportResult` success structure and return it.
- This means:
  - UI components and hooks don’t change at first.
  - You gain a clear, composable internal error pipeline using `Result`.

**Step 4: Update `withImportErrorHandling`**

- Consider re-implementing `withImportErrorHandling` on top of `neverthrow`:
  - It can become a thin adapter that:
    - Wraps the `fn` into a `Result` using `wrapResult`.
    - Logs or sets status on error.
    - Converts back to `{ success, error }` for external callers.

**Step 5: Add tests / adjust existing tests**

- Add or update tests around:
  - Invalid URLs.
  - Unsupported URL types.
  - Failure to extract transcripts / website content.
  - DB failures in `saveRecipeToDatabase`.
- Verify `Result` errors are correctly converted to `error` strings in the public API return values.

---

### Task 5: Introduce Result-based variants for `recipeApi`, `pantryApi`, `mealPlanApi`

**Goal:** Provide explicit `Result`-returning functions for the main data APIs while keeping the current promise-returning APIs for compatibility.

**Files:**

- Modify: `data/api/recipeApi.ts`
- Modify: `data/api/pantryApi.ts`
- Modify: `data/api/mealPlanApi.ts`

**Step 1: List high-value methods**

- For each API, identify key methods:
  - `recipeApi`: `fetchAllRecipes`, `getRecipeById`, `searchRecipes`, `addRecipe`, `updateRecipe`, `deleteRecipe`, `getAvailableRecipesWithCompletion`, `generateTailoredRecipe`, etc.
  - `pantryApi`: `fetchAllPantryItems`, `addPantryItem`, `addPantryItemsWithMetadata`, `updatePantryItem`, etc.
  - `mealPlanApi`: `getAllMealPlanItems`, `addToPlan`, `getMealPlanItemByRecipeId`, `isRecipeInPlan`, `removeFromPlan`, etc.

**Step 2: Add `Result`-returning counterparts**

- For each method, add a new `*Result` or similarly named function, for example:
  - `fetchAllRecipesResult(): Promise<AppResult<Recipe[], AppError>>`
  - `getRecipeByIdResult(id: string): Promise<AppResult<Recipe | null, AppError>>`
  - `fetchAllPantryItemsResult(): Promise<AppResult<PantryItem[], AppError>>`
- Implement them using `wrapResult` / `logAndWrapResult` and domain error types instead of legacy `withErrorHandling`.

**Step 3: Implement legacy wrappers on top of Result**

- Refactor the existing methods to be thin veneers over the new Result variants:
  - Example for `fetchAllRecipes`:
    - Call `const res = await recipeApi.fetchAllRecipesResult();`
    - If `res` is ok, return `res.data`.
    - If error, log and either:
      - Re-throw (if current contract throws).
      - Return a default (e.g. `[]`) if that matches current behavior.
- This gives you:
  - New call sites can opt into `Result` and handle errors explicitly.
  - Older call sites continue to behave as before.

**Step 4: Use more precise `AppError` variants**

- When wrapping:
  - Use `NotFoundError` for “no recipe/stock” cases instead of generic `UnknownError`.
  - Use `InfraError` for DB/WatermelonDB/Supabase failures.
  - Use `ValidationError` for bad inputs (e.g. invalid IDs, negative quantities).

**Step 5: Update 1–2 call sites as examples**

- Choose a couple of representative hooks or components (e.g. `useYouTubeRecipeQueries`, pantry list hook) and:
  - Switch them to call the `*Result` variants instead of legacy methods.
  - Handle errors by:
    - Displaying user-friendly messages based on `AppError.kind`.
    - Logging for unknown errors.
  - This becomes a template for future migrations.

---

### Task 6: Testing and documentation

**Files:**

- Add/modify tests under existing test structure (if present).
- Create or update documentation:
  - `docs/plans/2026-02-28-neverthrow-adoption.md` (this plan).
  - Optionally a short `docs/error-handling.md` or section in an existing architecture doc.

**Step 1: Add targeted tests for Result behavior**

- For each migrated API:
  - Add tests for `*Result` functions that:
    - Verify success cases (`ok` branch).
    - Verify error classification (`AppError.kind`) for representative failures.

**Step 2: Document conventions for new code**

- In `docs/error-handling.md` (or similar):
  - State that new async functions in the data/API layer should:
    - Prefer returning `Result<T, AppError>` instead of throwing.
    - Use `wrapResult` / `logAndWrapResult` and `AppError` factories.
  - Clarify:
    - Where exceptions are still allowed (e.g. top-level React Query `queryFn` that wraps lower-level Result functions).
    - How UI code should typically map `AppError` kinds to user messages.

**Step 3: Plan follow-up phases**

- Once the pilot and core APIs are stable:
  - Identify remaining hotspots that still use `withErrorHandling` directly and consider migrating them to Results.
  - Consider adding lightweight linting or code review rules to keep new code aligned with the Result pattern.

---

## Execution Options

Plan complete and saved to `docs/plans/2026-02-28-neverthrow-adoption.md`. Two execution options:

1. **Subagent-driven (this repo/session)** – Implement tasks one by one, following the steps above, with review and tests between tasks.
2. **Parallel session** – Open a new session dedicated to implementation, using this plan as the source of truth and executing tasks in order.

Tell me which option you prefer (or how you’d like to customize the scope), and we can start executing from **Task 1**.
