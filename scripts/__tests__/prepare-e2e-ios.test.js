const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { prepareE2EIos } = require("../prepare-e2e-ios");

let directory;
let target;
beforeEach(() => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), "cookkit-e2e-"));
  target = path.join(directory, ".xcode.env.updates");
});
afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

it("preserves existing overrides and is idempotent", () => {
  fs.writeFileSync(target, "# existing local override");
  prepareE2EIos(target);
  const first = fs.readFileSync(target, "utf8");
  prepareE2EIos(target);
  expect(fs.readFileSync(target, "utf8")).toBe(first);
  expect(first).toMatch(/^# existing local override\n/);
});

it.each([
  ["true", "unset/1"],
  ["false", "1/unset"],
  ["", "1/unset"],
])("changes bundling only for EXPO_PUBLIC_E2E=%s", (flag, expected) => {
  prepareE2EIos(target);
  const result = execFileSync(
    "/bin/sh",
    [
      "-c",
      '. "$1"; printf "%s/%s" "${SKIP_BUNDLING-unset}" "${FORCE_BUNDLING-unset}"',
      "e2e-test",
      target,
    ],
    {
      encoding: "utf8",
      env: { EXPO_PUBLIC_E2E: flag, SKIP_BUNDLING: "1" },
    }
  );
  expect(result).toBe(expected);
});

it("refreshes the previous managed block while preserving surrounding overrides", () => {
  fs.writeFileSync(
    target,
    '# before\n# Cookkit Detox embedded bundle\nif [ "$EXPO_PUBLIC_E2E" = "true" ]; then\n  unset SKIP_BUNDLING\n  export FORCE_BUNDLING=1\nfi\n# after\n'
  );
  prepareE2EIos(target);
  const result = fs.readFileSync(target, "utf8");
  expect(result).toMatch(/^# before\n/);
  expect(result).toMatch(/# after\n$/);
  expect(result).toContain("--dev false");
  expect(result.match(/# Cookkit Detox embedded bundle/g)).toHaveLength(1);
});

it.each([
  ["true", "--minify false --dev false"],
  ["false", "--minify false"],
])(
  "uses production JS only for E2E=%s and preserves existing packager arguments",
  (flag, expected) => {
    prepareE2EIos(target);
    const result = execFileSync(
      "/bin/sh",
      ["-c", '. "$1"; printf "%s" "$EXTRA_PACKAGER_ARGS"', "e2e-test", target],
      {
        encoding: "utf8",
        env: { EXPO_PUBLIC_E2E: flag, EXTRA_PACKAGER_ARGS: "--minify false" },
      }
    );
    expect(result).toBe(expected);
  }
);
