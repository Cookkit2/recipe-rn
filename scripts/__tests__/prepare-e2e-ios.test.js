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
