const path = require("node:path");
const { spawnSync } = require("node:child_process");
const policy = require("../dependency-backports.json");
const {
  installedInventory,
  verifyBackports,
  classifyAdvisories,
} = require("../audit-dependencies.cjs");
const root = path.resolve(__dirname, "../..");

describe("verified dependency audit", () => {
  let inventory;
  beforeAll(() => {
    const tree = spawnSync("bun", ["pm", "ls", "--all"], { cwd: root, encoding: "utf8" });
    expect(tree.status).toBe(0);
    inventory = installedInventory(root, tree.stdout);
  });

  test("validates every registered backport and its installed copies", () => {
    expect(verifyBackports(root, policy, inventory).size).toBe(policy.length);
  });

  test("does not accept an empty dependency inventory", () => {
    expect(() => installedInventory(root, "")).toThrow(/empty dependency inventory/);
  });

  test("canonicalizes npm aliases using the actual package name", () => {
    expect(inventory.packages["string-width-cjs"]).toBeUndefined();
    expect(inventory.packages["string-width"]).toContain("4.2.3");
  });

  test("audits the native and compatibility compiler aliases under their published names", () => {
    const native = require("@typescript/native/package.json");
    const compatibility = require("typescript/package.json");
    expect(inventory.packages["@typescript/native"]).toBeUndefined();
    expect(inventory.packages[native.name]).toContain(native.version);
    expect(inventory.packages[compatibility.name]).toContain(compatibility.version);
  });

  test("fails when the patch file hash changes", () => {
    const changed = [{ ...policy[0], patchSha256: "0".repeat(64) }];
    expect(() => verifyBackports(root, changed, inventory)).toThrow(/patch hash mismatch/);
  });

  test("fails when installed source no longer matches the reviewed patch", () => {
    const file = Object.keys(policy[0].files)[0];
    const changed = [{ ...policy[0], files: { [file]: "0".repeat(64) } }];
    expect(() => verifyBackports(root, changed, inventory)).toThrow(
      /installed source hash mismatch/
    );
  });

  test("fails when the installed patched package cannot be found", () => {
    expect(() => verifyBackports(root, policy, { locations: new Map() })).toThrow(/not installed/);
  });

  test("only covers the exact reviewed package, version, and advisory", () => {
    const id = policy[0].advisories[0];
    const finding = {
      severity: "high",
      vulnerable_versions: "*",
      url: `https://github.com/advisories/${id}`,
    };
    const packages = { [policy[0].package]: [policy[0].version, "99.0.0"], unrelated: ["1.0.0"] };
    const verified = verifyBackports(root, policy, inventory);
    const result = classifyAdvisories(
      packages,
      {
        [policy[0].package]: [
          finding,
          { ...finding, url: "https://github.com/advisories/GHSA-1234-5678-9abc" },
        ],
        unrelated: [finding],
      },
      verified
    );
    expect(result.covered).toHaveLength(1);
    expect(result.unresolved).toHaveLength(4);
  });

  test.each([null, [], { braces: {} }, { unknown: [] }])(
    "fails closed on malformed advisory data: %j",
    (response) => {
      expect(() => classifyAdvisories({ braces: ["3.0.3"] }, response, new Map())).toThrow(
        /Invalid advisory/
      );
    }
  );

  test("does not report fixed versions as vulnerable just because a package has an advisory", () => {
    expect(
      classifyAdvisories(
        { uuid: ["11.1.1"] },
        {
          uuid: [
            {
              vulnerable_versions: "<11.1.1",
              url: "https://github.com/advisories/GHSA-w5hq-g745-h8pq",
            },
          ],
        },
        new Map()
      ).unresolved
    ).toEqual([]);
  });

  test("does not recognize an advisory ID from a different host as a reviewed backport", () => {
    const entry = policy[0];
    const result = classifyAdvisories(
      { [entry.package]: [entry.version] },
      {
        [entry.package]: [
          {
            vulnerable_versions: "*",
            url: `https://example.com/advisories/${entry.advisories[0]}`,
          },
        ],
      },
      verifyBackports(root, policy, inventory)
    );
    expect(result.covered).toEqual([]);
    expect(result.unresolved).toHaveLength(1);
  });
});
