import { ok, err, AppResult } from "../result";
import { Result } from "neverthrow";

describe("utils/result", () => {
  it("should create an ok result", () => {
    const value = "success value";
    const result = ok(value);

    expect(result.isOk()).toBe(true);
    expect(result.isErr()).toBe(false);

    if (result.isOk()) {
      expect(result.value).toBe(value);
    }
  });

  it("should create an err result", () => {
    const errorMsg = "error occurred";
    const result = err(errorMsg);

    expect(result.isOk()).toBe(false);
    expect(result.isErr()).toBe(true);

    if (result.isErr()) {
      expect(result.error).toBe(errorMsg);
    }
  });

  describe("AppResult types", () => {
    it("should correctly handle generic typing with default Error type", () => {
      // Type test: ensure AppResult defaults to Error for E
      const mockSuccessResult: AppResult<string> = ok("success");
      const mockErrorResult: AppResult<string> = err(new Error("failure"));

      expect(mockSuccessResult.isOk()).toBe(true);
      expect(mockErrorResult.isErr()).toBe(true);

      if (mockErrorResult.isErr()) {
         expect(mockErrorResult.error).toBeInstanceOf(Error);
      }
    });

    it("should correctly handle custom error types", () => {
      // Type test: custom error type
      type CustomError = { code: number; message: string };
      const customError: CustomError = { code: 404, message: "Not Found" };

      const result: AppResult<string, CustomError> = err(customError);

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toEqual(customError);
        expect(result.error.code).toBe(404);
      }
    });
  });
});
