import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { log } from "../logger";
import { logger } from "react-native-logs";
import * as Sentry from "@sentry/react-native";

jest.mock("react-native-logs", () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
  return {
    logger: {
      createLogger: jest.fn(() => mockLogger),
    },
  };
});

jest.mock("@sentry/react-native", () => {
  return {
    logger: {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
    },
  };
});

describe("logger", () => {
  const rnLogger = logger.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("log methods", () => {
    it("trace calls rnLogger.debug and Sentry.logger.trace", () => {
      log.trace("test message", { arg: "value" });
      expect(rnLogger.debug).toHaveBeenCalledWith("test message", { arg: "value" });
      expect(Sentry.logger.trace).toHaveBeenCalledWith("test message", { arg: "value" });
    });

    it("debug calls rnLogger.debug and Sentry.logger.debug", () => {
      log.debug("test message", "arg1", 2);
      expect(rnLogger.debug).toHaveBeenCalledWith("test message", "arg1", 2);
      expect(Sentry.logger.debug).toHaveBeenCalledWith("test message", { arg_0: "arg1", arg_1: 2 });
    });

    it("info calls rnLogger.info and Sentry.logger.info", () => {
      log.info("test message");
      expect(rnLogger.info).toHaveBeenCalledWith("test message");
      expect(Sentry.logger.info).toHaveBeenCalledWith("test message", {});
    });

    it("warn calls rnLogger.warn and Sentry.logger.warn", () => {
      log.warn("test message", { bool: true });
      expect(rnLogger.warn).toHaveBeenCalledWith("test message", { bool: true });
      expect(Sentry.logger.warn).toHaveBeenCalledWith("test message", { bool: true });
    });

    it("error calls rnLogger.error and Sentry.logger.error", () => {
      const err = new Error("test err");
      log.error("test message", err);
      expect(rnLogger.error).toHaveBeenCalledWith("test message", err);
      // Object.entries(new Error()) is [], so `parseLogAttributes` returns {} for the Error object since it is treated as an empty object
      expect(Sentry.logger.error).toHaveBeenCalledWith("test message", {});
    });

    it("fatal calls rnLogger.error and Sentry.logger.fatal", () => {
      log.fatal("test message", { a: 1 });
      expect(rnLogger.error).toHaveBeenCalledWith("test message", { a: 1 });
      expect(Sentry.logger.fatal).toHaveBeenCalledWith("test message", { a: 1 });
    });
  });

  describe("parseLogAttributes", () => {
    it("handles empty args", () => {
      log.info("msg");
      expect(Sentry.logger.info).toHaveBeenCalledWith("msg", {});
    });

    it("handles primitive args", () => {
      log.info("msg", "string", 123, true);
      expect(Sentry.logger.info).toHaveBeenCalledWith("msg", {
        arg_0: "string",
        arg_1: 123,
        arg_2: true,
      });
    });

    it("handles object args", () => {
      log.info("msg", { str: "val", num: 456, bool: false, nested: { a: 1 } });
      expect(Sentry.logger.info).toHaveBeenCalledWith("msg", {
        str: "val",
        num: 456,
        bool: false,
        nested: "[object Object]", // String({a: 1}) is [object Object]
      });
    });

    it("handles array args", () => {
      log.info("msg", [1, 2, 3]);
      expect(Sentry.logger.info).toHaveBeenCalledWith("msg", {
        arg_0: "1,2,3",
      });
    });

    it("handles null and undefined args", () => {
      log.info("msg", null, undefined);
      // null and undefined are ignored by `else if (arg !== null && arg !== undefined)`
      expect(Sentry.logger.info).toHaveBeenCalledWith("msg", {});
    });

    it("handles object with null and undefined values", () => {
      log.info("msg", { a: null, b: undefined, c: 1 });
      expect(Sentry.logger.info).toHaveBeenCalledWith("msg", { c: 1 });
    });
  });

  describe("error handling", () => {
    it("swallows Sentry errors and does not throw", () => {
      // @ts-ignore
      Sentry.logger.info.mockImplementationOnce(() => {
        throw new Error("Sentry error");
      });

      expect(() => {
        log.info("test message");
      }).not.toThrow();
      expect(rnLogger.info).toHaveBeenCalledWith("test message");
    });
  });
});
