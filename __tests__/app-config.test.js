const configureApp = require("../app.config");

const publicDsn = "https://public-key@o123.ingest.sentry.io/456";
const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv, APP_ENV: "development", EAS_BUILD: "true" };
  delete process.env.EXPO_PUBLIC_SENTRY_DSN;
});

afterEach(() => {
  process.env = originalEnv;
});

it.each([undefined, "", "   ", "your_sentry_dsn"])(
  "production rejects a missing or invalid Sentry DSN (%s)",
  (dsn) => {
    process.env.APP_ENV = "production";
    if (dsn !== undefined) process.env.EXPO_PUBLIC_SENTRY_DSN = dsn;
    expect(() => configureApp({ config: {} })).toThrow(/EXPO_PUBLIC_SENTRY_DSN/);
  }
);

it("production exposes the public DSN to Expo Constants without exposing upload credentials", () => {
  process.env.APP_ENV = "production";
  process.env.EXPO_PUBLIC_SENTRY_DSN = ` ${publicDsn} `;
  process.env.SENTRY_AUTH_TOKEN = "private-upload-token";
  const result = configureApp({ config: { extra: { retained: true } } });
  expect(result.extra.EXPO_PUBLIC_SENTRY_DSN).toBe(publicDsn);
  expect(result.extra.retained).toBe(true);
  expect(result.extra.eas.projectId).toBe("191bf781-c649-4520-84d0-461f5b5a8427");
  expect(JSON.stringify(result)).not.toContain("private-upload-token");
});

it("production preserves an existing Expo Constants DSN when there is no environment override", () => {
  process.env.APP_ENV = "production";
  const result = configureApp({ config: { extra: { EXPO_PUBLIC_SENTRY_DSN: publicDsn } } });
  expect(result.extra.EXPO_PUBLIC_SENTRY_DSN).toBe(publicDsn);
});

it("allows development without a Sentry DSN", () => {
  expect(configureApp({ config: {} }).extra.EXPO_PUBLIC_SENTRY_DSN).toBeUndefined();
});

it("allows EAS CLI inspection before remote build variables have been loaded", () => {
  process.env.APP_ENV = "production";
  delete process.env.EAS_BUILD;
  expect(configureApp({ config: {} }).extra.EXPO_PUBLIC_SENTRY_DSN).toBeUndefined();
});
