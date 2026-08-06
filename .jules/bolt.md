## 2024-08-01 - Testing fetch timeout correctly
**Learning:** When mocking the global `fetch` API in Jest, assigning `global.fetch = jest.fn()` directly pollutes the global object and causes TypeScript errors because `fetch` is a read-only property.
**Action:** Always use `jest.spyOn(global, 'fetch')` to mock it, and `jest.restoreAllMocks()` in `afterEach` to clean up the environment and prevent test pollution.
