jest.mock("react-native", () => ({ PixelRatio: { get: () => 3 } }));
const mockFiles = new Set<string>();
const mockDraw = jest.fn();
const mockDispose = jest.fn();
jest.mock("expo-file-system", () => ({
  Paths: { cache: "file:///cache" },
  File: class {
    uri: string;
    constructor(root: string, name: string) {
      this.uri = `${root}/${name}`;
    }
    get exists() {
      return mockFiles.has(this.uri);
    }
    write() {
      mockFiles.add(this.uri);
    }
  },
}));
jest.mock("expo-image", () => ({ Image: { getCachePathAsync: jest.fn(async () => undefined) } }));
jest.mock("@shopify/react-native-skia", () => ({
  BlendMode: { SrcIn: 1 },
  ImageFormat: { PNG: 1 },
  Skia: {
    Data: { fromURI: jest.fn(async () => ({})) },
    Image: {
      MakeImageFromEncoded: () => ({ width: () => 100, height: () => 50, dispose: mockDispose }),
    },
    Surface: {
      MakeOffscreen: jest.fn(() => ({
        getCanvas: () => ({ clear: jest.fn(), drawImageRect: mockDraw }),
        makeImageSnapshot: () => ({ encodeToBase64: () => "png", dispose: mockDispose }),
        dispose: mockDispose,
      })),
    },
    Paint: () => ({ setAntiAlias: jest.fn(), setColorFilter: jest.fn() }),
    Color: (value: string) => value,
    ColorFilter: { MakeBlend: jest.fn() },
  },
}));

import { outlinedThumbnail } from "../outlined-thumbnail";
import { Skia } from "@shopify/react-native-skia";
import { Image } from "expo-image";

it("bakes one shared thumbnail and reuses the file on later mounts", async () => {
  const first = outlinedThumbnail("file:///food.png", 64, "white", 2);
  const duplicate = outlinedThumbnail("file:///food.png", 64, "white", 2);
  expect(first).toBe(duplicate);
  const uri = await first;
  expect(uri).toMatch(/^file:\/\/\/cache\/outlined-v1-/);
  expect(Skia.Surface.MakeOffscreen).toHaveBeenCalledWith(204, 204);
  expect(mockDraw).toHaveBeenCalledTimes(9);
  expect(mockDraw.mock.calls[8]?.[2]).toEqual({ x: 6, y: 54, width: 192, height: 96 });
  expect(await outlinedThumbnail("file:///food.png", 64, "white", 2)).toBe(uri);
  expect(mockDraw).toHaveBeenCalledTimes(9);
});

it("uses only native-cached bytes for remote images, keeping cache misses on the existing renderer", async () => {
  expect(
    await outlinedThumbnail("https://example.com/not-cached.png", 64, "white", 2)
  ).toBeUndefined();
  expect(Image.getCachePathAsync).toHaveBeenCalledWith("https://example.com/not-cached.png");
  expect(Skia.Data.fromURI).not.toHaveBeenCalledWith("https://example.com/not-cached.png");
});

it("normalizes absolute native cache paths before handing them to Skia", async () => {
  jest.mocked(Image.getCachePathAsync).mockResolvedValue("/cache/native-image.png");
  await outlinedThumbnail("https://example.com/cached.png", 64, "white", 2);
  expect(Skia.Data.fromURI).toHaveBeenCalledWith("file:///cache/native-image.png");
});

it("releases native resources when rendering fails so a later attempt can retry", async () => {
  mockDispose.mockClear();
  mockDraw.mockImplementationOnce(() => {
    throw new Error("Rendering failed");
  });
  await expect(outlinedThumbnail("file:///retry.png", 64, "white", 2)).rejects.toThrow(
    "Rendering failed"
  );
  expect(mockDispose).toHaveBeenCalledTimes(2);
  expect(await outlinedThumbnail("file:///retry.png", 64, "white", 2)).toMatch(
    /^file:\/\/\/cache\/outlined-v1-/
  );
});
