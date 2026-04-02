import { wrapResult, logAndWrapResult } from "../api-error-handler";
import { unknownError, validationError, infraError } from "~/types/AppError";
import { log } from "../logger";

jest.mock("../logger", () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe("api-error-handler", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("wrapResult", () => {
    it("should return ok(value) when the function succeeds", async () => {
      const fn = jest.fn().mockResolvedValue("success-value");
      const result = await wrapResult(fn);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("success-value");
      }
    });

    it("should return err(unknownError) when the function throws a generic Error", async () => {
      const error = new Error("Something went wrong");
      const fn = jest.fn().mockRejectedValue(error);
      const result = await wrapResult(fn);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("unknown");
        expect(result.error.message).toBe("Something went wrong");
        expect(result.error.cause).toBe(error);
      }
    });

    it("should return err(unknownError) when the function throws a non-Error", async () => {
      const fn = jest.fn().mockRejectedValue("string error");
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
      const fn = jest.fn().mockRejectedValue(appErr);
      const result = await wrapResult(fn);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("validation");
        expect(result.error.message).toBe("Invalid input");
      }
    });

    it("should use custom errorMapper if provided", async () => {
      const error = new Error("Database timeout");
      const fn = jest.fn().mockRejectedValue(error);

      const errorMapper = jest.fn((e: unknown) => {
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
      const fn = jest.fn().mockRejectedValue(error);

      const errorMapper = jest.fn(() => {
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
  });

  describe("logAndWrapResult", () => {
    it("should return ok(value) when the function succeeds and not log", async () => {
      const fn = jest.fn().mockResolvedValue("success-value");
      const result = await logAndWrapResult(fn, "Prefix");

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe("success-value");
      }
      expect(log.error).not.toHaveBeenCalled();
    });

    it("should log and return err(unknownError) when the function throws an Error", async () => {
      const error = new Error("Network error");
      const fn = jest.fn().mockRejectedValue(error);
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
      const fn = jest.fn().mockRejectedValue(existingError);
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
      const fn = jest.fn().mockRejectedValue(existingError);
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
      const fn = jest.fn().mockRejectedValue(existingError);
      const result = await logAndWrapResult(fn, "Prefix");

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.kind).toBe("infra");
        expect(result.error.message).toBe("DB crash");
      }
      expect(log.error).toHaveBeenCalledWith("Prefix:", existingError);
    });
  });
});
