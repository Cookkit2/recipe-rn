function isValidSentryDsn(dsn) {
  try {
    const url = new URL(dsn);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      Boolean(url.username) &&
      /^\d+$/.test(url.pathname.split("/").at(-1))
    );
  } catch {
    return false;
  }
}

module.exports = ({ config }) => {
  const env = process.env;
  const configuredDsn = env.EXPO_PUBLIC_SENTRY_DSN || config.extra?.EXPO_PUBLIC_SENTRY_DSN;
  const dsn = typeof configuredDsn === "string" ? configuredDsn.trim() : undefined;

  // EAS CLI resolves this config before it has loaded remote variables, too.
  // Validate inside the build worker, after the production environment is loaded.
  if (env.EAS_BUILD === "true" && env.APP_ENV === "production" && !isValidSentryDsn(dsn)) {
    throw new Error(
      "Set EXPO_PUBLIC_SENTRY_DSN to a valid Sentry client DSN in the EAS production environment."
    );
  }

  return {
    ...config,
    owner: "gihming",
    extra: {
      ...(config.extra ?? {}),
      eas: {
        ...(config.extra?.eas ?? {}),
        projectId: "191bf781-c649-4520-84d0-461f5b5a8427",
      },
      EXPO_PUBLIC_E2E: env.EXPO_PUBLIC_E2E,
      EXPO_PUBLIC_SENTRY_DSN: dsn,
    },
  };
};
