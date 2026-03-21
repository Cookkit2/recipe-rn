## 2024-05-20 - [Fix SQL Injection Risk in RecipeRepository]
**Vulnerability:** Used WatermelonDB's built-in `Q.sanitizeLikeString(tag)` which may not sufficiently cover the application's comprehensive threat model compared to the project's centralized sanitization utilities.
**Learning:** Always prefer the project's bespoke input sanitization functions (like `sanitizeSearchTerm` or `sanitizeForDatabase` from `~/utils/input-sanitization`) over generic library-provided sanitization to ensure consistent defense-in-depth across the application.
**Prevention:** Audit all uses of `Q.like` or direct string interpolations in database queries to ensure they pass through `sanitizeSearchTerm` or similar project-specific validation/sanitization functions before execution.
