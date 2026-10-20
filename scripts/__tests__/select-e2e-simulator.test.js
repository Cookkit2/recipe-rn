const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  selectE2ESimulator,
  writeSimulatorEnv,
  PREFERRED_SIMULATOR_OS,
  PREFERRED_SIMULATOR_TYPE,
} = require("../select-e2e-simulator.cjs");

const IPHONE_AIR = "com.apple.CoreSimulator.SimDeviceType.iPhone-Air";
const IPHONE_17 = "com.apple.CoreSimulator.SimDeviceType.iPhone-17";
const IPAD = "com.apple.CoreSimulator.SimDeviceType.iPad-A16";

const devicetypes = [
  { identifier: IPHONE_AIR, name: "iPhone Air" },
  { identifier: IPHONE_17, name: "iPhone 17" },
  { identifier: IPAD, name: "iPad (A16)" },
];

function runtime(name, version, identifier, isAvailable = true) {
  return { name, version, identifier, isAvailable };
}

function phone(udid, deviceTypeIdentifier, name, isAvailable = true) {
  return { udid, deviceTypeIdentifier, name, isAvailable, state: "Shutdown" };
}

describe("selectE2ESimulator", () => {
  test("keeps iPhone Air / iOS 26.2 when that simulator is available", () => {
    const selected = selectE2ESimulator({
      devicetypes,
      runtimes: [
        runtime("iOS 26.2", "26.2", "com.apple.CoreSimulator.SimRuntime.iOS-26-2"),
        runtime("iOS 26.5", "26.5", "com.apple.CoreSimulator.SimRuntime.iOS-26-5"),
      ],
      devices: {
        "com.apple.CoreSimulator.SimRuntime.iOS-26-2": [
          phone("air-26-2", IPHONE_AIR, "iPhone Air"),
          phone("phone-17-26-2", IPHONE_17, "iPhone 17"),
        ],
        "com.apple.CoreSimulator.SimRuntime.iOS-26-5": [
          phone("air-26-5", IPHONE_AIR, "iPhone Air"),
        ],
      },
    });

    expect(selected).toMatchObject({
      type: PREFERRED_SIMULATOR_TYPE,
      os: PREFERRED_SIMULATOR_OS,
      udid: "air-26-2",
      fallback: false,
    });
  });

  test("matches iOS 26.2 by runtime name when the version string differs", () => {
    const selected = selectE2ESimulator({
      devicetypes,
      runtimes: [
        runtime("iOS 26.2", "26.2.0", "com.apple.CoreSimulator.SimRuntime.iOS-26-2"),
        runtime("iOS 26.5", "26.5", "com.apple.CoreSimulator.SimRuntime.iOS-26-5"),
      ],
      devices: {
        "com.apple.CoreSimulator.SimRuntime.iOS-26-2": [phone("air", IPHONE_AIR, "iPhone Air")],
        "com.apple.CoreSimulator.SimRuntime.iOS-26-5": [phone("newer", IPHONE_AIR, "iPhone Air")],
      },
    });

    expect(selected).toMatchObject({ type: "iPhone Air", os: "iOS 26.2", fallback: false });
  });

  test("uses the runtime name when the preferred device is only matched by version", () => {
    const selected = selectE2ESimulator({
      devicetypes,
      runtimes: [runtime("iOS 26.2", "26.2", "com.apple.CoreSimulator.SimRuntime.iOS-26-2")],
      devices: {
        "iOS 26.2": [phone("air", IPHONE_AIR, "Renamed Air")],
      },
    });

    expect(selected).toMatchObject({ type: "iPhone Air", os: "iOS 26.2", fallback: false });
  });

  test("falls back to iPhone Air on the newest available runtime", () => {
    const selected = selectE2ESimulator({
      devicetypes,
      runtimes: [
        runtime("iOS 26.2", "26.2", "com.apple.CoreSimulator.SimRuntime.iOS-26-2", false),
        runtime("iOS 26.4", "26.4.1", "com.apple.CoreSimulator.SimRuntime.iOS-26-4"),
        runtime("iOS 26.5", "26.5", "com.apple.CoreSimulator.SimRuntime.iOS-26-5"),
      ],
      devices: {
        "com.apple.CoreSimulator.SimRuntime.iOS-26-2": [
          phone("air-26-2", IPHONE_AIR, "iPhone Air"),
        ],
        "com.apple.CoreSimulator.SimRuntime.iOS-26-4": [
          phone("air-26-4", IPHONE_AIR, "iPhone Air"),
        ],
        "com.apple.CoreSimulator.SimRuntime.iOS-26-5": [
          phone("phone-17", IPHONE_17, "iPhone 17"),
          phone("pad", IPAD, "iPad (A16)"),
          phone("unavailable-air", IPHONE_AIR, "iPhone Air", false),
        ],
      },
    });

    expect(selected).toMatchObject({
      type: "iPhone Air",
      os: "iOS 26.4",
      udid: "air-26-4",
      fallback: true,
      preferredType: "iPhone Air",
      preferredOS: "iOS 26.2",
    });
    expect(selected.candidates.map((candidate) => candidate.type)).not.toContain("iPad (A16)");
  });

  test("picks the newest iPhone when iPhone Air is not installed", () => {
    const selected = selectE2ESimulator({
      devicetypes,
      runtimes: [
        runtime("iOS 26.4", "26.4.1", "com.apple.CoreSimulator.SimRuntime.iOS-26-4"),
        runtime("iOS 26.5", "26.5", "com.apple.CoreSimulator.SimRuntime.iOS-26-5"),
      ],
      devices: {
        "com.apple.CoreSimulator.SimRuntime.iOS-26-4": [phone("old", IPHONE_17, "iPhone 17")],
        "com.apple.CoreSimulator.SimRuntime.iOS-26-5": [
          phone("b-new", IPHONE_17, "iPhone 17"),
          phone("a-new", IPHONE_17, "iPhone 17"),
        ],
      },
    });

    expect(selected).toMatchObject({
      type: "iPhone 17",
      os: "iOS 26.5",
      udid: "a-new",
      fallback: true,
    });
  });

  test("reads a runtime that is only present as a device-list key", () => {
    const selected = selectE2ESimulator({
      devices: {
        "com.apple.CoreSimulator.SimRuntime.iOS-26-5": [
          { name: "iPhone Air", udid: "air", isAvailable: true },
        ],
      },
    });

    expect(selected).toMatchObject({ type: "iPhone Air", os: "iOS 26.5", fallback: true });
  });

  test("fails when the runner has no available iPhone", () => {
    expect(() =>
      selectE2ESimulator({
        devicetypes,
        runtimes: [runtime("iOS 26.5", "26.5", "com.apple.CoreSimulator.SimRuntime.iOS-26-5")],
        devices: {
          "com.apple.CoreSimulator.SimRuntime.iOS-26-5": [phone("pad", IPAD, "iPad (A16)")],
        },
      })
    ).toThrow(/No available iPhone simulator/);
  });
});

describe("writeSimulatorEnv", () => {
  test("appends the Detox device query to GITHUB_ENV", () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), "detox-sim-"));
    const githubEnv = path.join(directory, "env");
    fs.writeFileSync(githubEnv, "EXISTING=1\n");

    const lines = writeSimulatorEnv({ type: "iPhone Air", os: "iOS 26.5" }, githubEnv);

    expect(lines).toEqual(["DETOX_SIMULATOR_TYPE=iPhone Air", "DETOX_SIMULATOR_OS=iOS 26.5"]);
    expect(fs.readFileSync(githubEnv, "utf8")).toBe(
      "EXISTING=1\nDETOX_SIMULATOR_TYPE=iPhone Air\nDETOX_SIMULATOR_OS=iOS 26.5\n"
    );
  });
});

describe("detox.config simulator query", () => {
  const originalType = process.env.DETOX_SIMULATOR_TYPE;
  const originalOS = process.env.DETOX_SIMULATOR_OS;

  afterEach(() => {
    if (originalType === undefined) delete process.env.DETOX_SIMULATOR_TYPE;
    else process.env.DETOX_SIMULATOR_TYPE = originalType;
    if (originalOS === undefined) delete process.env.DETOX_SIMULATOR_OS;
    else process.env.DETOX_SIMULATOR_OS = originalOS;
    jest.resetModules();
  });

  test("defaults ios.sim.debug to iPhone Air / iOS 26.2", () => {
    delete process.env.DETOX_SIMULATOR_TYPE;
    delete process.env.DETOX_SIMULATOR_OS;
    jest.resetModules();
    const config = require("../../detox.config.js");

    expect(config.devices.simulator.device).toEqual({
      type: "iPhone Air",
      os: "iOS 26.2",
    });
    expect(config.configurations["ios.sim.debug"]).toEqual({
      device: "simulator",
      app: "ios.debug",
    });
  });

  test("uses the simulator selected for the runner", () => {
    process.env.DETOX_SIMULATOR_TYPE = " iPhone 17 ";
    process.env.DETOX_SIMULATOR_OS = " iOS 26.5 ";
    jest.resetModules();
    const config = require("../../detox.config.js");

    expect(config.devices.simulator.device).toEqual({
      type: "iPhone 17",
      os: "iOS 26.5",
    });
  });
});
