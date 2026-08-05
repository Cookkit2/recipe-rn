import * as fs from "fs";
const file1 = "lib/function-gemma/FunctionGemmaService.ts";
const file2 = "lib/function-gemma/CookkitToolExecutor.ts";

let content1 = fs.readFileSync(file1, "utf8");

content1 = content1.replace(
  "properties: Record<string, any>;",
  "properties: Record<string, unknown>;"
);

content1 = content1.replace(
  "arguments: Record<string, any>;",
  "arguments: Record<string, unknown>;"
);

content1 = content1.replace(
  "text: string\n): Array<{ name: string; arguments: Record<string, any> }> {",
  "text: string\n): Array<{ name: string; arguments: Record<string, unknown> }> {"
);

content1 = content1.replace(
  "const calls: Array<{ name: string; arguments: Record<string, any> }> = [];",
  "const calls: Array<{ name: string; arguments: Record<string, unknown> }> = [];"
);

content1 = content1.replace(
  "const args: Record<string, any> = {};",
  "const args: Record<string, unknown> = {};"
);

fs.writeFileSync(file1, content1);
