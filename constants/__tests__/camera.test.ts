import { CAMERA_PHOTO_OUTPUT_OPTIONS, CAMERA_RESOLUTION } from "~/constants/camera";

describe("camera constants", () => {
  it("captures create-flow photos as JPEG so Skia can decode them", () => {
    expect(CAMERA_PHOTO_OUTPUT_OPTIONS).toEqual({
      targetResolution: CAMERA_RESOLUTION,
      containerFormat: "jpeg",
      qualityPrioritization: "speed",
    });
  });

  it("keeps create-flow photos below full device resolution for faster local processing", () => {
    expect(CAMERA_RESOLUTION).toEqual({ width: 1512, height: 2016 });
  });
});
