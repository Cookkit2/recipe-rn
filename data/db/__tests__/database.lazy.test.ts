/**
 * Lazy WatermelonDB singleton tests (issue #733).
 *
 * Asserts the invariants the issue calls out:
 *  - construction is deferred (Database ctor does NOT run at module import),
 *  - the Database is constructed exactly once across many accesses (singleton
 *    invariant preserved by the memoizing Proxy),
 *  - the Proxy preserves property-access / method-call syntax.
 *
 * The whole module graph is mocked so the test runs in pure node without the
 * native SQLite adapter. We spy on the mocked `Database` constructor to count
 * constructions.
 */

// Track constructions across the (isolated) module evaluation.
const databaseCtor = jest.fn().mockImplementation(function (this: any, opts: any) {
  this._opts = opts;
  // Mimic the surface the Proxy forwards to.
  this.collections = { get: (name: string) => ({ name }) };
  this.write = jest.fn(async (cb: any) => cb());
});

jest.mock("@nozbe/watermelondb", () => ({
  Database: databaseCtor,
}));

jest.mock("@nozbe/watermelondb/adapters/sqlite", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((opts: any) => ({ kind: "sqlite", ...opts })),
}));

jest.mock("@nozbe/watermelondb/adapters/lokijs", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation((opts: any) => ({ kind: "lokijs", ...opts })),
}));

jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));

jest.mock("../schema", () => ({ __esModule: true, default: { tables: [] } }));
jest.mock("../migrations", () => ({ __esModule: true, default: {} }));
jest.mock("../models", () => ({ __esModule: true, modelClasses: [function MockModel() {}] }));
jest.mock("~/utils/logger", () => ({
  log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

describe("data/db/database lazy singleton (issue #733)", () => {
  beforeEach(() => {
    databaseCtor.mockClear();
  });

  it("does NOT construct the Database at module import (defers off launch path)", () => {
    jest.isolateModules(() => {
      require("../database");
    });
    expect(databaseCtor).not.toHaveBeenCalled();
  });

  it("constructs the Database exactly once across many accesses (singleton invariant)", () => {
    let mod: any;
    jest.isolateModules(() => {
      mod = require("../database");
    });

    // Many property reads + method calls — must construct only once.
    const c1 = mod.database.collections.get("recipe");
    const c2 = mod.database.collections.get("stock");
    mod.default.collections.get("recipe");
    void mod.database.write;

    expect(databaseCtor).toHaveBeenCalledTimes(1);
    expect(c1).toEqual({ name: "recipe" });
    expect(c2).toEqual({ name: "stock" });
  });

  it("preserves the named-export and default-export identity contract", () => {
    let mod: any;
    jest.isolateModules(() => {
      mod = require("../database");
    });

    // Touch to construct.
    void mod.database.collections;
    // `default` is the same singleton as `database`.
    expect(mod.default).toBe(mod.database);
  });

  it("collections accessor reads through the lazy database proxy", () => {
    let mod: any;
    jest.isolateModules(() => {
      mod = require("../database");
    });

    expect(mod.collections.recipes).toEqual({ name: "recipe" });
    expect(mod.collections.stock).toEqual({ name: "stock" });
    expect(mod.collections.households).toEqual({ name: "household" });
    // Still only one Database construction from all collection reads.
    expect(databaseCtor).toHaveBeenCalledTimes(1);
  });
});
