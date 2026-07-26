## 2024-05-24 - Babel Decorator Legacy Parameter Migration
**Learning:** Older Babel legacy decorator plugin setups used `{ legacy: true }`, but newer versions (Babel 7.19+) expect `{ version: "legacy" }`.
**Action:** When configuring `@babel/plugin-proposal-decorators` for legacy decorators (e.g., WatermelonDB models), ensure the `version: "legacy"` parameter format is used instead of the deprecated `legacy: true` option.

## 2024-05-24 - ts-jest verbatimModuleSyntax compatibility
**Learning:** Typescript strict mode with `verbatimModuleSyntax: true` can cause `ts-jest` to throw ESM syntax errors in tests if `isolatedModules` isn't enabled for the transformer.
**Action:** When using `ts-jest` and `verbatimModuleSyntax`, always add `isolatedModules: true` to the `ts-jest` transformer options in `jest.config.js`.
