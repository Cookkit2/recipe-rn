import { execFileSync } from "node:child_process";
import path from "node:path";

describe("rate limiter lifecycle", () => {
  it("does not keep a Node process alive after importing the shared limiters", () => {
    const script = `
      const fs = require("node:fs");
      const ts = require("typescript");
      const source = fs.readFileSync("utils/rate-limiter.ts", "utf8");
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
      });
      new Function("exports", outputText)({});
      process.stdout.write("imported");
    `;

    expect(
      execFileSync(process.execPath, ["-e", script], {
        cwd: path.resolve(__dirname, "../.."),
        timeout: 3000,
        encoding: "utf8",
      })
    ).toBe("imported");
  });
});
