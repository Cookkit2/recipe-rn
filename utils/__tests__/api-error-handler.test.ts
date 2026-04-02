import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import {
  withArrayErrorHandling,
  withErrorHandling,
  withErrorLogging,
  withSilentError,
  withStructuredError,
  withWarningHandling,
  createErrorHandler,
  logAndWrapResult,
  wrapResult,
} from "../api-error-handler";
import { log } from "../logger";
import { infraError, unknownError, validationError, type AppError } from "~/types/AppError";
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

    it("should expose all expected methods", async () => {
      const handler = createErrorHandler({});
      const mockFn = jest.fn<() => Promise<string>>().mockResolvedValue("success");

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
    it("should return ok(value) when the function succeeds", async () => {
      const fn = jest.fn<() => Promise<string>>().mockResolvedValue("success-value");
      const result = await wrapResult(fn);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) expect(result.value).toBe("success-value");
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should return err(unknownError) when the function throws a generic Error", async () => {
      const error = new Error("Something went wrong");
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(error);
      const result = await wrapResult(fn);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toBe("Something went wrong");
        expect(result.error.cause).toBe(error);
      }
    });

    it("should return err(unknownError) when the function throws a non-Error", async () => {
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue("string error");
      const result = await wrapResult(fn);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toBe("Unknown error");
        expect(result.error.cause).toBe("string error");
      }
    });

    it("should pass through an existing AppError", async () => {
      const appErr = validationError("Invalid input");
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(appErr);
      const result = await wrapResult(fn);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("validation");
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should use custom errorMapper if provided", async () => {
      const error = new Error("Database timeout");
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(error);

      const errorMapper = jest.fn<(e: unknown) => AppError>((e: unknown) => {
        if (e instanceof Error && e.message.includes("timeout")) {
          return infraError("DB Timeout", e);
        }
        return unknownError("Other error", e);
      });

      const result = await wrapResult(fn, errorMapper);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("infra");
        expect(result.error.message).toBe("DB Timeout");
        expect(result.error.cause).toBe(error);
      }
      expect(errorMapper).toHaveBeenCalledWith(error);
    });

    it("should fallback to default mapping if custom errorMapper throws", async () => {
      const error = new Error("Original error");
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(error);

      const errorMapper = jest.fn<(e: unknown) => AppError>(() => {
        throw new Error("Mapper failed");
      });

      const result = await wrapResult(fn, errorMapper);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toBe("Original error");
        expect(result.error.cause).toBe(error);
      }
    });

    it("should accept a custom mapper that returns an AppError", async () => {
      const mapperError: AppError = { kind: "validation", message: "Custom", cause: undefined };
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error("ignored"));
      const mapper = jest.fn<(e: unknown) => AppError>().mockReturnValue(mapperError);

      const result = await wrapResult(fn, mapper);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("validation");
        expect(result.error.message).toBe("Custom");
      }
    });
  });

  describe("logAndWrapResult", () => {
    it("should return ok(value) when the function succeeds and not log", async () => {
      const fn = jest.fn<() => Promise<string>>().mockResolvedValue("success-value");
      const result = await logAndWrapResult(fn, "Prefix");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("success-value");
      }
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should log and return err(unknownError) when the function throws an Error", async () => {
      const error = new Error("Network error");
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(error);
      const result = await logAndWrapResult(fn, "Prefix");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toBe("Prefix: Network error");
        expect(result.error.cause).toBe(error);
      }
      expect(log.error).toHaveBeenCalledWith("Prefix:", error);
    });

    it("should prefix the error message even when returning an existing unknown error", async () => {
      const existingError = unknownError("Some unknown thing");
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(existingError);
      const result = await logAndWrapResult(fn, "Prefix");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toBe("Prefix: Some unknown thing");
      }
      expect(log.error).toHaveBeenCalledWith("Prefix:", existingError);
    });

    it("should not re-prefix the error message if it already has the prefix", async () => {
      const existingError = unknownError("Prefix: Some unknown thing");
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(existingError);
      const result = await logAndWrapResult(fn, "Prefix");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toBe("Prefix: Some unknown thing");
      }
      expect(log.error).toHaveBeenCalledWith("Prefix:", existingError);
    });

    it("should pass through an existing non-unknown AppError without modifying message", async () => {
      const existingError = infraError("DB crash");
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(existingError);
      const result = await logAndWrapResult(fn, "Prefix");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("infra");
        expect(result.error.message).toBe("DB crash");
      }
      expect(log.error).toHaveBeenCalledWith("Prefix:", existingError);
    });

    it("should preserve AppError kind and message if already prefixed", async () => {
      const appError: AppError = {
        kind: "not_found",
        message: `${errorMessage}: Not found`,
        cause: undefined,
      };
      const mapper = jest.fn<(e: unknown) => AppError>().mockReturnValue(appError);
      const fn = jest.fn<() => Promise<string>>().mockRejectedValue(new Error("ignored"));

      const result = await logAndWrapResult(fn, errorMessage, mapper);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("not_found");
        expect(result.error.message).toBe(`${errorMessage}: Not found`);
      }
    });
  });
});
