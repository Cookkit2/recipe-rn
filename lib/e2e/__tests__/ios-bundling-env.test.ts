import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

it("restores the Detox bundle override after pod install removes it", () => {
  const root = mkdtempSync(join(tmpdir(), "cookkit-e2e-env-"));
  try {
    mkdirSync(join(root, "ios"));
    writeFileSync(
      join(root, "env.sh"),
      readFileSync(resolve(__dirname, "../../../scripts/e2e-ios-env.sh"))
    );
    const result = spawnSync(
      "bash",
      [
        "-c",
        '. ./env.sh; export SKIP_BUNDLING=1; . ./ios/.xcode.env.updates; test -z "$SKIP_BUNDLING" && test "$FORCE_BUNDLING" = 1',
      ],
      { cwd: root, encoding: "utf8" }
    );
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
