import {
  withErrorHandling,
  withErrorLogging,
  withStructuredError,
  withSilentError,
  withWarningHandling,
  withArrayErrorHandling,
  createErrorHandler,
  wrapResult,
  logAndWrapResult,
} from "../api-error-handler";
import { log } from "../logger";

// Mock the logger
jest.mock("../logger", () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("api-error-handler", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("withErrorHandling", () => {
    it("should return the function result on success", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const result = await withErrorHandling(mockFn, "Error msg", "default");

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should return default value and log error on failure", async () => {
      const error = new Error("test error");
      const mockFn = jest.fn().mockRejectedValue(error);
      const result = await withErrorHandling(mockFn, "Error msg", "default");

      expect(result).toBe("default");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith("Error msg:", error);
    });
  });

  describe("withErrorLogging", () => {
    it("should return the function result on success", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const result = await withErrorLogging(mockFn, "Error msg");

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should re-throw error and log it on failure", async () => {
      const error = new Error("test error");
      const mockFn = jest.fn().mockRejectedValue(error);

      await expect(withErrorLogging(mockFn, "Error msg")).rejects.toThrow(error);
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith("Error msg:", error);
    });
  });

  describe("withStructuredError", () => {
    it("should return success result on success", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const result = await withStructuredError(mockFn, "Error msg");

      expect(result).toEqual({ success: true, data: "success" });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should return structured error and log on failure with Error instance", async () => {
      const error = new Error("test error message");
      const mockFn = jest.fn().mockRejectedValue(error);
      const result = await withStructuredError(mockFn, "Error msg prefix");

      expect(result).toEqual({ success: false, error: "test error message" });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith("Error msg prefix: Error -", "test error message");
    });

    it("should handle non-Error instances properly", async () => {
      const mockFn = jest.fn().mockRejectedValue("string error");
      const result = await withStructuredError(mockFn, "Error msg prefix");

      expect(result).toEqual({ success: false, error: "Unknown error occurred" });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith("Error msg prefix: Error -", "Unknown error occurred");
    });
  });

  describe("withSilentError", () => {
    it("should return the function result on success", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const result = await withSilentError(mockFn, "default");

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should return default value and NOT log on failure", async () => {
      const error = new Error("test error");
      const mockFn = jest.fn().mockRejectedValue(error);
      const result = await withSilentError(mockFn, "default");

      expect(result).toBe("default");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).not.toHaveBeenCalled();
    });
  });

  describe("withWarningHandling", () => {
    it("should return the function result on success", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const result = await withWarningHandling(mockFn, "Warning msg", "default");

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.warn).not.toHaveBeenCalled();
    });

    it("should return default value and log warning on failure", async () => {
      const error = new Error("test error");
      const mockFn = jest.fn().mockRejectedValue(error);
      const result = await withWarningHandling(mockFn, "Warning msg", "default");

      expect(result).toBe("default");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.warn).toHaveBeenCalledWith("Warning msg:", error);
    });
  });

  describe("withArrayErrorHandling", () => {
    it("should process all items and return results on success", async () => {
      const items = [1, 2, 3];
      const mockProcessor = jest.fn().mockImplementation(async (item) => item * 2);
      const result = await withArrayErrorHandling(items, mockProcessor, "Error prefix");

      expect(result).toEqual([2, 4, 6]);
      expect(mockProcessor).toHaveBeenCalledTimes(3);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should filter out failures, log errors, and continue processing", async () => {
      const items = [1, 2, 3];
      const error = new Error("test error");
      const mockProcessor = jest.fn().mockImplementation(async (item) => {
        if (item === 2) throw error;
        return item * 2;
      });
      const result = await withArrayErrorHandling(items, mockProcessor, "Error prefix");

      expect(result).toEqual([2, 6]);
      expect(mockProcessor).toHaveBeenCalledTimes(3);
      expect(log.error).toHaveBeenCalledWith("Error prefix:", 2, error);
    });
  });

  describe("createErrorHandler", () => {
    it("should create handler with context prefix", async () => {
      const handler = createErrorHandler({ context: "TestCtx" });
      const mockFn = jest.fn().mockRejectedValue(new Error("test error"));

      await handler.withErrorHandling(mockFn, "msg", "default");
      expect(log.error).toHaveBeenCalledWith("TestCtx: msg:", expect.any(Error));
    });

    it("should create handler without context prefix if none provided", async () => {
      const handler = createErrorHandler({});
      const mockFn = jest.fn().mockRejectedValue(new Error("test error"));

      await handler.withErrorHandling(mockFn, "msg", "default");
      expect(log.error).toHaveBeenCalledWith("msg:", expect.any(Error));
    });

    it("should expose all expected methods", async () => {
      const handler = createErrorHandler({});
      const mockFn = jest.fn().mockResolvedValue("success");

      expect(await handler.withErrorHandling(mockFn, "msg", "def")).toBe("success");
      expect(await handler.withErrorLogging(mockFn, "msg")).toBe("success");
      expect(await handler.withStructuredError(mockFn, "msg")).toEqual({
        success: true,
        data: "success",
      });
      expect(await handler.withSilentError(mockFn, "def")).toBe("success");
      expect(await handler.withWarningHandling(mockFn, "msg", "def")).toBe("success");
    });
  });

  describe("wrapResult", () => {
    it("should return ok result on success", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const result = await wrapResult(mockFn);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("success");
      }
    });

    it("should return err with default mapped error on failure", async () => {
      const error = new Error("test error message");
      const mockFn = jest.fn().mockRejectedValue(error);
      const result = await wrapResult(mockFn);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toBe("test error message");
      }
    });

    it("should use custom errorMapper if provided", async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error("test"));
      const customMapper = jest.fn().mockReturnValue({ kind: "validation", message: "Custom" });
      const result = await wrapResult(mockFn, customMapper);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.kind).toBe("validation");
        expect(result.error.message).toBe("Custom");
      }
    });
  });

  describe("logAndWrapResult", () => {
    it("should return ok result on success without logging", async () => {
      const mockFn = jest.fn().mockResolvedValue("success");
      const result = await logAndWrapResult(mockFn, "Prefix");

      expect(result.isOk()).toBe(true);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should return err, map error, and log on failure", async () => {
      const error = new Error("test error");
      const mockFn = jest.fn().mockRejectedValue(error);
      const result = await logAndWrapResult(mockFn, "Prefix");

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toBe("Prefix: test error");
      }
      expect(log.error).toHaveBeenCalledWith("Prefix:", error);
    });

    it("should preserve existing AppError kind and not prefix if already prefixed", async () => {
      const appError = { kind: "not_found", message: "Prefix: Not found" };
      const customMapper = jest.fn().mockReturnValue(appError);
      const mockFn = jest.fn().mockRejectedValue(new Error("test"));

      const result = await logAndWrapResult(mockFn, "Prefix", customMapper);

      expect(result.isOk()).toBe(false);
      if (!result.isOk()) {
        expect(result.error.kind).toBe("not_found");
        expect(result.error.message).toBe("Prefix: Not found");
      }
    });
  });
});
