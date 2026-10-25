const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

/** Device query for ios.sim.debug in detox.config.js. */
const PREFERRED_SIMULATOR_TYPE = "iPhone Air";
const PREFERRED_SIMULATOR_OS = "iOS 26.2";

/**
 * @param {string} left
 * @param {string} right
 * @returns {number}
 */
function compareVersions(left, right) {
  const a = String(left)
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const b = String(right)
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const diff = (a[index] || 0) - (b[index] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/**
 * @param {string} preferredOS
 * @returns {string}
 */
function preferredVersion(preferredOS) {
  return preferredOS.replace(/^iOS\s+/i, "").trim();
}

/**
 * @param {{ name?: string, version?: string, identifier?: string, isAvailable?: boolean }} runtime
 * @returns {{ identifier: string, name: string, version: string } | null}
 */
function normalizeRuntime(runtime) {
  if (!runtime || runtime.isAvailable === false) return null;
  const name = typeof runtime.name === "string" ? runtime.name.trim().replace(/\s+/g, " ") : "";
  const version = typeof runtime.version === "string" ? runtime.version.trim() : "";
  const osName = /^iOS\s+\d/i.test(name) ? name : version ? `iOS ${version}` : "";
  if (!osName) return null;
  return {
    identifier: typeof runtime.identifier === "string" ? runtime.identifier : "",
    name: osName,
    version: version || osName.replace(/^iOS\s+/i, ""),
  };
}

/**
 * @param {string} key
 * @returns {{ identifier: string, name: string, version: string } | null}
 */
function runtimeFromDeviceKey(key) {
  if (/^iOS\s+\d/i.test(key)) {
    const name = key.trim().replace(/\s+/g, " ");
    return { identifier: "", name, version: name.replace(/^iOS\s+/i, "") };
  }
  const match = key.match(/SimRuntime\.iOS-(.+)$/);
  if (!match?.[1]) return null;
  const version = match[1].replace(/-/g, ".");
  return {
    identifier: key,
    name: `iOS ${version}`,
    version,
  };
}

/**
 * @param {Array<{ identifier?: string, name?: string }> | undefined} devicetypes
 * @returns {Map<string, string>}
 */
function indexDeviceTypes(devicetypes) {
  const byId = new Map();
  for (const entry of devicetypes || []) {
    if (entry?.identifier && entry.name) byId.set(entry.identifier, entry.name);
  }
  return byId;
}

/**
 * @param {{ name?: string, deviceTypeIdentifier?: string }} device
 * @param {Map<string, string>} typesById
 * @returns {string}
 */
function deviceTypeName(device, typesById) {
  const identifier = device.deviceTypeIdentifier;
  if (identifier && typesById.has(identifier)) return typesById.get(identifier) || "";
  return typeof device.name === "string" ? device.name : "";
}

/**
 * @param {{ os: string, version: string }} candidate
 * @param {string} preferredOS
 * @returns {boolean}
 */
function runtimeMatchesPreferred(candidate, preferredOS) {
  const version = preferredVersion(preferredOS);
  return (
    candidate.os === preferredOS ||
    candidate.version === preferredOS ||
    candidate.version === version ||
    candidate.os === `iOS ${version}`
  );
}

/**
 * Pick the ios.sim.debug simulator from `xcrun simctl list` JSON.
 * Prefer iPhone Air / iOS 26.2. Otherwise keep iPhone Air on the newest
 * available runtime, then any other available iPhone.
 *
 * @param {{
 *   devices?: Record<string, Array<{ name?: string, udid?: string, isAvailable?: boolean, deviceTypeIdentifier?: string }>>,
 *   runtimes?: Array<{ name?: string, version?: string, identifier?: string, isAvailable?: boolean }>,
 *   devicetypes?: Array<{ identifier?: string, name?: string }>,
 * }} simctl
 * @param {{ preferredType?: string, preferredOS?: string }} [options]
 */
function selectE2ESimulator(simctl, options = {}) {
  const preferredType = options.preferredType || PREFERRED_SIMULATOR_TYPE;
  const preferredOS = options.preferredOS || PREFERRED_SIMULATOR_OS;
  const typesById = indexDeviceTypes(simctl.devicetypes);

  /** @type {Map<string, { identifier: string, name: string, version: string }>} */
  const runtimeByKey = new Map();
  for (const runtime of simctl.runtimes || []) {
    const normalized = normalizeRuntime(runtime);
    if (!normalized) continue;
    if (normalized.identifier) runtimeByKey.set(normalized.identifier, normalized);
    runtimeByKey.set(normalized.name, normalized);
  }

  /** @type {Array<{ type: string, os: string, version: string, udid: string }>} */
  const candidates = [];
  for (const [key, devices] of Object.entries(simctl.devices || {})) {
    const listed = (simctl.runtimes || []).find(
      (runtime) => runtime.identifier === key || runtime.name === key
    );
    if (listed?.isAvailable === false) continue;
    const runtime = runtimeByKey.get(key) || runtimeFromDeviceKey(key);
    if (!runtime) continue;

    for (const device of devices || []) {
      if (device?.isAvailable === false) continue;
      const type = deviceTypeName(device, typesById);
      if (!type.startsWith("iPhone")) continue;
      candidates.push({
        type,
        os: runtime.name,
        version: runtime.version,
        udid: typeof device.udid === "string" ? device.udid : "",
      });
    }
  }

  const exact = candidates
    .filter(
      (candidate) =>
        candidate.type === preferredType && runtimeMatchesPreferred(candidate, preferredOS)
    )
    .sort((left, right) => left.udid.localeCompare(right.udid));
  const chosen = exact[0] || rankFallbacks(candidates, preferredType)[0];

  if (!chosen) {
    const runtimes = [
      ...new Set((simctl.runtimes || []).map((runtime) => runtime.name).filter(Boolean)),
    ];
    throw new Error(
      `No available iPhone simulator for ios.sim.debug (preferred ${preferredType} / ${preferredOS}). Available iOS runtimes: ${runtimes.join(", ") || "none"}.`
    );
  }

  return {
    type: chosen.type,
    os: chosen.os,
    udid: chosen.udid,
    fallback: exact.length === 0,
    preferredType,
    preferredOS,
    candidates: candidates.map(({ type, os, udid }) => ({ type, os, udid })),
  };
}

/**
 * @param {Array<{ type: string, os: string, version: string, udid: string }>} candidates
 * @param {string} preferredType
 */
function rankFallbacks(candidates, preferredType) {
  return candidates.slice().sort((left, right) => {
    const leftPreferred = left.type === preferredType ? 0 : 1;
    const rightPreferred = right.type === preferredType ? 0 : 1;
    if (leftPreferred !== rightPreferred) return leftPreferred - rightPreferred;
    const version = compareVersions(right.version, left.version);
    if (version !== 0) return version;
    const name = left.type.localeCompare(right.type);
    if (name !== 0) return name;
    return left.udid.localeCompare(right.udid);
  });
}

/**
 * @param {{ type: string, os: string }} selected
 * @param {string | undefined} githubEnvPath
 * @returns {string[]}
 */
function writeSimulatorEnv(selected, githubEnvPath) {
  const lines = [`DETOX_SIMULATOR_TYPE=${selected.type}`, `DETOX_SIMULATOR_OS=${selected.os}`];
  if (githubEnvPath) fs.appendFileSync(githubEnvPath, `${lines.join("\n")}\n`);
  return lines;
}

/**
 * @param {string[]} args
 */
function readSimctl(args) {
  const result = spawnSync("xcrun", ["simctl", "list", ...args, "-j"], { encoding: "utf8" });
  const command = `xcrun simctl list ${args.join(" ")} -j`;
  if (result.error) {
    throw new Error(`${command} failed: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status}): ${(result.stderr || result.stdout || "").trim()}`
    );
  }
  return JSON.parse(result.stdout);
}

function main() {
  const devices = readSimctl(["devices", "available"]);
  const runtimes = readSimctl(["runtimes", "available"]);
  let devicetypes = { devicetypes: [] };
  try {
    devicetypes = readSimctl(["devicetypes"]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(`Device type list unavailable (${message}). Matching simulator names.`);
  }

  const selected = selectE2ESimulator({
    devices: devices.devices,
    runtimes: runtimes.runtimes,
    devicetypes: devicetypes.devicetypes,
  });

  if (selected.fallback) {
    console.log(
      `ios.sim.debug device ${selected.preferredType} (${selected.preferredOS}) is not available. Using ${selected.type} (${selected.os}).`
    );
    console.log("Available iPhone simulators:");
    for (const candidate of selected.candidates) {
      console.log(`- ${candidate.type} (${candidate.os}) ${candidate.udid}`);
    }
  } else {
    console.log(`ios.sim.debug device ${selected.type} (${selected.os}) is available.`);
  }

  const lines = writeSimulatorEnv(selected, process.env.GITHUB_ENV);
  for (const line of lines) console.log(line);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

module.exports = {
  PREFERRED_SIMULATOR_OS,
  PREFERRED_SIMULATOR_TYPE,
  compareVersions,
  selectE2ESimulator,
  writeSimulatorEnv,
};
