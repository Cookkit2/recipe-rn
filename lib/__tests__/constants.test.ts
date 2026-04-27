import { APP_CONFIG } from "../constants";

describe("APP_CONFIG", () => {
  it("should have DEEP_LINK_SCHEME defined", () => {
    expect(APP_CONFIG.DEEP_LINK_SCHEME).toBeDefined();
    expect(typeof APP_CONFIG.DEEP_LINK_SCHEME).toBe("string");
    expect(APP_CONFIG.DEEP_LINK_SCHEME.length).toBeGreaterThan(0);
  });

  it("should have DEEP_LINK_PATHS defined", () => {
    expect(APP_CONFIG.DEEP_LINK_PATHS).toBeDefined();
    expect(typeof APP_CONFIG.DEEP_LINK_PATHS).toBe("object");
  });

  it("should have AUTH_CALLBACK path", () => {
    expect(APP_CONFIG.DEEP_LINK_PATHS.AUTH_CALLBACK).toBeDefined();
    expect(typeof APP_CONFIG.DEEP_LINK_PATHS.AUTH_CALLBACK).toBe("string");
  });

  it("should have RESET_PASSWORD path", () => {
    expect(APP_CONFIG.DEEP_LINK_PATHS.RESET_PASSWORD).toBeDefined();
    expect(typeof APP_CONFIG.DEEP_LINK_PATHS.RESET_PASSWORD).toBe("string");
  });

  it("should have correct deep link scheme", () => {
    expect(APP_CONFIG.DEEP_LINK_SCHEME).toBe("recipe-app");
  });
});
