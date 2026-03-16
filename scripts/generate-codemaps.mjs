#!/usr/bin/env node
/**
 * Codemap generator - analyzes codebase structure for architecture documentation.
 * Scans imports, exports, and dependencies. Outputs token-lean codemaps.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const IGNORE = [
  "node_modules",
  ".expo",
  ".git",
  "dist",
  "build",
  "coverage",
  ".reports",
  "codemaps",
];

const EXTENSIONS = [".ts", ".tsx"];
const IMPORT_RE = /import\s+(?:(?:[\w*{}\s,]+\s+from\s+)|)(['"])([^'"]+)\1/g;
const EXPORT_RE = /export\s+(?:default\s+|)(?:function|const|class|interface|type|enum)\s+(\w+)/g;

function walk(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (IGNORE.some((x) => full.includes(x))) continue;
    if (e.isDirectory()) walk(full, files);
    else if (EXTENSIONS.some((ext) => e.name.endsWith(ext))) files.push(full);
  }
  return files;
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith(".") || spec.startsWith("~/")) {
    const base = spec.startsWith("~/") ? ROOT : path.dirname(fromFile);
    const target = spec.replace(/^~\//, "");
    const candidates = [
      path.join(base, target),
      path.join(base, target + ".ts"),
      path.join(base, target + ".tsx"),
      path.join(base, target, "index.ts"),
      path.join(base, target, "index.tsx"),
    ];
    for (const c of candidates) {
      const rel = path.relative(ROOT, c);
      if (fs.existsSync(c) && !rel.startsWith("..")) return rel.replace(/\\/g, "/");
    }
    return spec;
  }
  return null; // external
}

function analyze() {
  const files = walk(ROOT);
  const modules = {};
  const imports = {};
  const exports = {};

  for (const f of files) {
    const rel = path.relative(ROOT, f).replace(/\\/g, "/");
    const content = fs.readFileSync(f, "utf-8");
    const imps = [...content.matchAll(IMPORT_RE)].map((m) => m[2]);
    const exps = [...content.matchAll(EXPORT_RE)].map((m) => m[1]);

    modules[rel] = { imports: imps, exports: exps };
    imports[rel] = imps.map((s) => resolveImport(f, s)).filter(Boolean);
    exports[rel] = exps;
  }

  return { modules, imports, exports, fileCount: files.length };
}

function categorize(file) {
  if (file.startsWith("app/")) return "app";
  if (file.startsWith("components/")) return "components";
  if (file.startsWith("hooks/")) return "hooks";
  if (file.startsWith("store/")) return "store";
  if (file.startsWith("data/")) return "data";
  if (file.startsWith("lib/")) return "lib";
  if (file.startsWith("auth/")) return "auth";
  if (file.startsWith("utils/")) return "utils";
  if (file.startsWith("types/")) return "types";
  if (file.startsWith("constants/")) return "constants";
  return "other";
}

const result = analyze();
fs.mkdirSync(path.join(ROOT, "codemaps"), { recursive: true });
fs.writeFileSync(
  path.join(ROOT, "codemaps", "analysis.json"),
  JSON.stringify({ ...result, categorize: undefined }, null, 0)
);

// Summary stats
const byCategory = {};
for (const f of Object.keys(result.modules)) {
  const c = categorize(f);
  byCategory[c] = (byCategory[c] || 0) + 1;
}

console.log("Analysis complete:", result.fileCount, "files");
console.log("By category:", JSON.stringify(byCategory, null, 2));
