import { assistantErrorMessage } from "../errors";

it.each([
  [{ statusCode: 429 }, "The assistant is busy. Please try again in a moment."],
  [{ status: 503 }, "The assistant is temporarily unavailable. Please try again later."],
  [
    { statusCode: 401, message: "invalid private API key" },
    "The assistant is temporarily unavailable. Please try again later.",
  ],
  [new Error("Network request failed"), "Unable to connect. Check your connection and try again."],
  [{ name: "TimeoutError" }, "The assistant took too long to respond. Please try again."],
  [{ cause: { statusCode: 504 } }, "The assistant took too long to respond. Please try again."],
  [
    new Error("database query with private details"),
    "Something went wrong, please try again later",
  ],
  [null, "Something went wrong, please try again later"],
])("returns safe copy for %p", (error, expected) => {
  expect(assistantErrorMessage(error)).toBe(expected);
  expect(assistantErrorMessage(expected)).toBe(expected);
});
