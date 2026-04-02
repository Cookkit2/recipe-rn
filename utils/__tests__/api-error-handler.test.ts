import { describe, it, expect, jest, beforeEach } from "@jest/globals";
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
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("api-error-handler", () => {
  const mockError = new Error("Test error");
  const errorMessage = "Operation failed";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("withErrorLogging", () => {
    it("should return the result of the function if it succeeds", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockResolvedValue("success");
      const result = await withErrorLogging(mockFn, errorMessage);

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should log the error and re-throw if the function fails", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);

      await expect(withErrorLogging(mockFn, errorMessage)).rejects.toThrow(mockError);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith(`${errorMessage}:`, mockError);
    });
  });

  describe("withErrorHandling", () => {
    it("should return the result of the function if it succeeds", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockResolvedValue("success");
      const result = await withErrorHandling(mockFn, errorMessage, "default");

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should log the error and return the default value if the function fails", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      const result = await withErrorHandling(mockFn, errorMessage, "default");

      expect(result).toBe("default");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith(`${errorMessage}:`, mockError);
    });
  });

  describe("withStructuredError", () => {
    it("should return a success result if the function succeeds", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockResolvedValue("success");
      const result = await withStructuredError(mockFn, errorMessage);

      expect(result).toEqual({ success: true, data: "success" });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should log the error and return a failure result if the function fails", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      const result = await withStructuredError(mockFn, errorMessage);

      expect(result).toEqual({ success: false, error: mockError.message });
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith(`${errorMessage}: Error -`, mockError.message);
    });

    it("should handle non-Error objects being thrown", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue("string error");
      const result = await withStructuredError(mockFn, errorMessage);

      expect(result).toEqual({ success: false, error: "Unknown error occurred" });
      expect(log.error).toHaveBeenCalledWith(`${errorMessage}: Error -`, "Unknown error occurred");
    });
  });

  describe("withSilentError", () => {
    it("should return the result of the function if it succeeds", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockResolvedValue("success");
      const result = await withSilentError(mockFn, "default");

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should return the default value without logging if the function fails", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      const result = await withSilentError(mockFn, "default");

      expect(result).toBe("default");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.error).not.toHaveBeenCalled();
    });
  });

  describe("withWarningHandling", () => {
    it("should return the result of the function if it succeeds", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockResolvedValue("success");
      const result = await withWarningHandling(mockFn, errorMessage, "default");

      expect(result).toBe("success");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.warn).not.toHaveBeenCalled();
    });

    it("should log a warning and return the default value if the function fails", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      const result = await withWarningHandling(mockFn, errorMessage, "default");

      expect(result).toBe("default");
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(log.warn).toHaveBeenCalledWith(`${errorMessage}:`, mockError);
      expect(log.error).not.toHaveBeenCalled();
    });
  });

  describe("withArrayErrorHandling", () => {
    it("should process all items and return results", async () => {
      const items = [1, 2, 3];
      const mockFn = jest
        .fn<(item: number) => Promise<string>>()
        .mockImplementation(async (item) => `processed ${item}`);

      const results = await withArrayErrorHandling(items, mockFn, errorMessage);

      expect(results).toEqual(["processed 1", "processed 2", "processed 3"]);
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should skip failed items but continue processing others", async () => {
      const items = [1, 2, 3];
      const mockFn = jest
        .fn<(item: number) => Promise<string>>()
        .mockImplementation(async (item) => {
          if (item === 2) throw mockError;
          return `processed ${item}`;
        });

      const results = await withArrayErrorHandling(items, mockFn, errorMessage);

      expect(results).toEqual(["processed 1", "processed 3"]);
      expect(mockFn).toHaveBeenCalledTimes(3);
      expect(log.error).toHaveBeenCalledTimes(1);
      expect(log.error).toHaveBeenCalledWith(`${errorMessage}:`, 2, mockError);
    });
  });

  describe("createErrorHandler", () => {
    const errorHandler = createErrorHandler({ context: "TestContext" });

    it("should prefix error messages correctly with context", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      const result = await errorHandler.withErrorHandling(mockFn, "Failed", "default");

      expect(result).toBe("default");
      expect(log.error).toHaveBeenCalledWith("TestContext: Failed:", mockError);
    });

    it("should work without context", async () => {
      const noContextHandler = createErrorHandler({});
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      const result = await noContextHandler.withErrorHandling(mockFn, "Failed", "default");

      expect(result).toBe("default");
      expect(log.error).toHaveBeenCalledWith("Failed:", mockError);
    });
  });

  describe("wrapResult", () => {
    it("should return ok with value on success", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockResolvedValue("success");
      const result = await wrapResult(mockFn);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe("success");
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should return err with AppError on failure", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      const result = await wrapResult(mockFn);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toBe("Test error");
        expect(result.error.cause).toBe(mockError);
      }
      expect(log.error).not.toHaveBeenCalled();
    });
  });

  describe("logAndWrapResult", () => {
    it("should return ok with value on success", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockResolvedValue("success");
      const result = await logAndWrapResult(mockFn, errorMessage);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe("success");
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should log error and return err with AppError on failure", async () => {
      const mockFn = jest.fn<() => Promise<string>>().mockRejectedValue(mockError);
      const result = await logAndWrapResult(mockFn, errorMessage);

      expect(log.error).toHaveBeenCalledWith(`${errorMessage}:`, mockError);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toContain(errorMessage);
        expect(result.error.cause).toBe(mockError);
      }
    });
  });
});
