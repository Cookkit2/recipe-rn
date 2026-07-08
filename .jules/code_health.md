## 2025-02-18 - Remove unused function
**Learning:** Removing unused utility functions reduces codebase clutter, cognitive load, and potentially bundle size.
**Action:** When asked to remove an unused export, always verify it's unused via global text search (`grep -rn "exportName" .`), then completely remove it and its associated tests and imports. Ensure you run type checks and tests to verify everything is safe before submitting.
