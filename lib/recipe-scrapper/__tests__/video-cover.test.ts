import { getRecipeVideoCover } from "../shared/video-cover";

it("retains a real late video frame as a small persistent recipe image", () => {
  expect(
    getRecipeVideoCover([
      { timestamp: 1, mimeType: "image/jpeg", data: "YWJj" },
      { timestamp: 15, mimeType: "image/jpeg", data: "ZGVm" },
    ])
  ).toBe("data:image/jpeg;base64,ZGVm");
});
it("ignores missing, malformed and oversized frame data", () => {
  expect(getRecipeVideoCover([])).toBeUndefined();
  expect(
    getRecipeVideoCover([{ timestamp: 1, mimeType: "image/jpeg", data: "x".repeat(180001) }])
  ).toBeUndefined();
  expect(
    getRecipeVideoCover([{ timestamp: 1, mimeType: "image/jpeg", data: "<script>" }])
  ).toBeUndefined();
});
