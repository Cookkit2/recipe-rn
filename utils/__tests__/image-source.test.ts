import { toExpoImageSource } from "../image-source";

describe("React Native to Expo image sources", () => {
  test("accepts frozen source arrays without giving Expo the frozen array", () => {
    const source = Object.freeze([{ uri: "https://example.com/food.png", width: 48 }]);
    expect(toExpoImageSource(source)).toEqual(source);
    expect(Object.isFrozen(toExpoImageSource(source))).toBe(false);
  });

  test("preserves URI metadata, bundled assets, strings, and missing sources", () => {
    const source = { uri: "file:///food.jpg", headers: { Accept: "image/*" }, scale: 2 };
    expect(toExpoImageSource(source)).toBe(source);
    expect(toExpoImageSource(12)).toBe(12);
    expect(toExpoImageSource("file:///food.jpg")).toBe("file:///food.jpg");
    expect(toExpoImageSource(undefined)).toBeUndefined();
  });
});
