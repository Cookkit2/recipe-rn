# Performance Baseline: TailoredRecipeMappingRepository

This document establishes the theoretical database operation counts for the current implementation of `cleanupExpired` and `clearForBaseRecipe` in `TailoredRecipeMappingRepository.ts`.

## Current Implementation Analysis

### 1. `cleanupExpired`
For $N$ expired mappings, each having 1 recipe, $S$ steps, and $I$ ingredients:

- **Queries:**
  - $1$ query to fetch expired mappings.
  - $N$ queries to find recipes (`recipeCollection.find`).
  - $N$ queries to fetch steps (`stepsCollection.query`).
  - $N$ queries to fetch ingredients (`ingredientsCollection.query`).
  - **Total Queries: $1 + 3N$**

- **Writes (Deletions):**
  - $N$ writes to delete mappings.
  - $N$ writes to delete recipes.
  - $N \times S$ writes to delete steps.
  - $N \times I$ writes to delete ingredients.
  - **Total Writes: $2N + N(S + I)$**

### 2. `clearForBaseRecipe`
For $M$ tailored recipes found for a base recipe, each having $K$ mappings, $S$ steps, and $I$ ingredients:

- **Queries:**
  - $1$ query to fetch tailored recipes.
  - $M$ queries to fetch mappings.
  - $M$ queries to fetch steps.
  - $M$ queries to fetch ingredients.
  - **Total Queries: $1 + 3M$**

- **Writes (Deletions):**
  - $M \times K$ writes to delete mappings.
  - $M$ writes to delete recipes.
  - $M \times S$ writes to delete steps.
  - $M \times I$ writes to delete ingredients.
  - **Total Writes: $M(1 + K + S + I)$**

---

## Optimized Implementation Analysis

### 1. `cleanupExpired`
- **Queries:**
  - $1$ query to fetch expired mappings.
  - $1$ query to fetch all recipes (`Q.oneOf`).
  - $1$ query to fetch all steps (`Q.oneOf`).
  - $1$ query to fetch all ingredients (`Q.oneOf`).
  - **Total Queries: 4** (Constant relative to $N$)

- **Writes (Deletions):**
  - $1$ batched write for all records.
  - **Total Writes: 1**

### 2. `clearForBaseRecipe`
- **Queries:**
  - $1$ query to fetch tailored recipes.
  - $1$ query to fetch all mappings (`Q.oneOf`).
  - $1$ query to fetch all steps (`Q.oneOf`).
  - $1$ query to fetch all ingredients (`Q.oneOf`).
  - **Total Queries: 4** (Constant relative to $M$)

- **Writes (Deletions):**
  - $1$ batched write for all records.
  - **Total Writes: 1**

## Comparison Table (for $N=50, S=10, I=15$)

| Method | Metric | Original | Optimized | Reduction |
| :--- | :--- | :--- | :--- | :--- |
| `cleanupExpired` | Queries | 151 | 4 | **97.3%** |
| `cleanupExpired` | Writes | 1350 | 1 | **99.9%** |
| `clearForBaseRecipe` (K=1) | Queries | 151 | 4 | **97.3%** |
| `clearForBaseRecipe` (K=1) | Writes | 1350 | 1 | **99.9%** |

## Conclusion
The optimization successfully eliminates the N+1 query problem by batching both fetches and deletions. This significantly reduces database round-trips and I/O overhead, especially when cleaning up a large number of expired tailored recipes.

*Note: Actual performance benchmarks could not be executed due to environment network limitations preventing dependency installation (`ts-jest`). Verification was performed via static analysis and code review of the implemented batching patterns.*
