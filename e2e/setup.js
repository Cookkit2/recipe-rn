// iOS 26 permission grants restart SpringBoard. On the CI simulator that
// took longer than Jest's 120s hook budget, and launchApp with delete:true
// uninstalled and reinstalled before those grants even started. The process
// itself reached Detox "ready" about 30s after simctl launch. Do the
// uninstall and the grants once per file. Each test only restarts the process,
// so the in-test relaunch still keeps pantry data.
const LAUNCH_TIMEOUT_MS = 300000;

const permissions = {
  notifications: "YES",
  camera: "YES",
  photos: "YES",
  microphone: "YES",
};

beforeAll(async () => {
  await device.launchApp({
    newInstance: true,
    delete: true,
    permissions,
  });
}, LAUNCH_TIMEOUT_MS);

beforeEach(async () => {
  await device.launchApp({
    newInstance: true,
  });
}, LAUNCH_TIMEOUT_MS);
