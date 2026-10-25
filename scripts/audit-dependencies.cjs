const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const semver = require("semver");

const root = path.resolve(__dirname, "..");
const registry = "https://registry.npmjs.org/-/npm/v1/security/advisories/bulk";
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");

function installedInventory(projectRoot, tree) {
  const locked = new Map();
  for (const line of tree.split("\n")) {
    const match = line.match(/[├└]── (.+)@([^\s@]+)(?:\s.*)?$/);
    if (!match) continue;
    if (!semver.valid(match[2])) throw new Error(`Invalid installed version: ${line}`);
    if (!locked.has(match[1])) locked.set(match[1], new Set());
    locked.get(match[1]).add(match[2]);
  }
  if (!locked.size) throw new Error("Bun returned an empty dependency inventory");

  const aliases = new Map();
  const locations = new Map();
  const visited = new Set();
  function visitPackage(directory, logicalName) {
    const real = fs.realpathSync(directory);
    const file = path.join(real, "package.json");
    if (!fs.existsSync(file)) {
      if (locked.has(logicalName)) throw new Error(`Missing package manifest: ${directory}`);
      return;
    }
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    if (locked.get(logicalName)?.has(manifest.version)) {
      aliases.set(logicalName, manifest.name);
      const key = `${manifest.name}@${manifest.version}`;
      if (!locations.has(key)) locations.set(key, new Set());
      locations.get(key).add(real);
    }
    if (visited.has(real)) return;
    visited.add(real);
    visitModules(path.join(real, "node_modules"));
  }
  function visitModules(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || (!entry.isDirectory() && !entry.isSymbolicLink())) continue;
      const child = path.join(directory, entry.name);
      if (entry.name.startsWith("@")) {
        for (const scoped of fs.readdirSync(child, { withFileTypes: true })) {
          if (scoped.isDirectory() || scoped.isSymbolicLink()) {
            visitPackage(path.join(child, scoped.name), `${entry.name}/${scoped.name}`);
          }
        }
      } else visitPackage(child, entry.name);
    }
  }
  visitModules(path.join(projectRoot, "node_modules"));

  const packages = {};
  for (const [logicalName, versions] of locked) {
    const name = aliases.get(logicalName) ?? logicalName;
    packages[name] = [...new Set([...(packages[name] ?? []), ...versions])];
  }
  return { packages, locations };
}

function verifyBackports(projectRoot, policy, inventory) {
  const manifest = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  const verified = new Map();
  for (const entry of policy) {
    const key = `${entry.package}@${entry.version}`;
    if (manifest.patchedDependencies?.[key] !== entry.patch) {
      throw new Error(`Backport is not registered: ${key}`);
    }
    if (hash(path.join(projectRoot, entry.patch)) !== entry.patchSha256) {
      throw new Error(`Backport patch hash mismatch: ${key}`);
    }
    const copies = inventory.locations.get(key);
    if (!copies?.size) throw new Error(`Backport is not installed: ${key}`);
    for (const directory of copies) {
      for (const [file, expected] of Object.entries(entry.files)) {
        if (hash(path.join(directory, file)) !== expected) {
          throw new Error(`Backport installed source hash mismatch: ${key}/${file}`);
        }
      }
    }
    verified.set(key, new Set(entry.advisories));
  }
  return verified;
}

function classifyAdvisories(packages, advisories, verified) {
  if (!advisories || typeof advisories !== "object" || Array.isArray(advisories)) {
    throw new Error("Invalid advisory response");
  }
  const covered = [];
  const unresolved = [];
  for (const [name, findings] of Object.entries(advisories)) {
    if (!Array.isArray(findings) || !packages[name])
      throw new Error(`Invalid advisory package: ${name}`);
    for (const finding of findings) {
      if (!semver.validRange(finding.vulnerable_versions))
        throw new Error(`Invalid advisory range for ${name}`);
      const id =
        typeof finding.url === "string" &&
        finding.url.match(/^https:\/\/github\.com\/advisories\/(GHSA-[a-z0-9-]+)$/)?.[1];
      for (const version of packages[name]) {
        if (!semver.satisfies(version, finding.vulnerable_versions)) continue;
        const result = {
          package: name,
          version,
          id: id || finding.url,
          severity: finding.severity,
        };
        (id && verified.get(`${name}@${version}`)?.has(id) ? covered : unresolved).push(result);
      }
    }
  }
  return { covered, unresolved };
}

async function main() {
  const tree = spawnSync("bun", ["pm", "ls", "--all"], { cwd: root, encoding: "utf8" });
  if (tree.error || tree.status !== 0)
    throw new Error(`Unable to inspect Bun dependencies: ${tree.stderr}`);
  const inventory = installedInventory(root, tree.stdout);
  const policy = JSON.parse(
    fs.readFileSync(path.join(__dirname, "dependency-backports.json"), "utf8")
  );
  const verified = verifyBackports(root, policy, inventory);
  const response = await fetch(registry, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inventory.packages),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Advisory service returned HTTP ${response.status}`);
  const { covered, unresolved } = classifyAdvisories(
    inventory.packages,
    await response.json(),
    verified
  );
  console.log(
    `Audited ${Object.keys(inventory.packages).length} packages; ${covered.length} advisory records covered by verified dependency policy.`
  );
  for (const finding of unresolved) console.error("UNRESOLVED", JSON.stringify(finding));
  if (unresolved.length) throw new Error(`${unresolved.length} unresolved dependency advisories`);

  // Version-only scanners cannot recognize local fixes. Require the real exploit
  // regressions as well as exact hashes; an advisory ID alone never grants an exception.
  const tests = spawnSync(
    "bun",
    [
      "run",
      "test",
      "--",
      "--runInBand",
      "--watchman=false",
      "scripts/__tests__/dependency-security.test.js",
      "scripts/__tests__/dependency-collection-limits.test.js",
    ],
    {
      cwd: root,
      stdio: "inherit",
    }
  );
  if (tests.error || tests.status !== 0) throw new Error("Dependency security regressions failed");
  console.log(
    "Dependency audit passed: no unresolved advisories; all backport regressions passed."
  );
}

module.exports = { installedInventory, verifyBackports, classifyAdvisories };
if (require.main === module) {
  main().catch((error) => {
    console.error(`Dependency audit failed: ${error.message}`);
    process.exitCode = 1;
  });
}
