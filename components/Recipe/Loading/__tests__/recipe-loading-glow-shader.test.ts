import path from "node:path";
import type { CanvasKit } from "canvaskit-wasm";
import { RECIPE_GLOW_COLORS, RECIPE_GLOW_SHADER, recipeGlowModes } from "../recipe-loading-glow";

it("compiles the native SkSL and renders a transparent center with rounded orange edges", async () => {
  // CanvasKit is shipped by Skia; use its actual compiler rather than mocking RuntimeEffect.
  const runtime = require.resolve("canvaskit-wasm/bin/full/canvaskit.js");
  const initialize = require(runtime);
  const kit: CanvasKit = await initialize({
    locateFile: (file: string) => path.join(path.dirname(runtime), file),
  });
  const errors: string[] = [];
  const effect = kit.RuntimeEffect.Make(RECIPE_GLOW_SHADER, (message) => errors.push(message));
  expect(errors).toEqual([]);
  expect(effect).not.toBeNull();
  if (!effect) return;
  const surface = kit.MakeSurface(240, 480)!;
  const paint = new kit.Paint();
  const modes = recipeGlowModes(1800, 1024);
  const colors = RECIPE_GLOW_COLORS;
  const shader = effect.makeShader([
    240,
    480,
    36,
    0.39,
    0.5,
    0.24,
    1,
    0.7,
    ...modes.cosine,
    ...modes.sine,
    ...colors.base,
    ...colors.highlight,
    ...colors.middle,
    ...colors.deep,
  ]);
  paint.setShader(shader);
  surface.getCanvas().clear(kit.TRANSPARENT);
  surface.getCanvas().drawPaint(paint);
  surface.flush();
  const image = surface.makeImageSnapshot();
  try {
    const pixels = image.readPixels(0, 0, {
      width: 240,
      height: 480,
      colorType: kit.ColorType.RGBA_8888,
      alphaType: kit.AlphaType.Unpremul,
      colorSpace: kit.ColorSpace.SRGB,
    })!;
    const index = (x: number, y: number) => (y * 240 + x) * 4;
    expect(pixels[index(120, 240) + 3]).toBe(0);
    expect(pixels[index(0, 0) + 3]).toBe(0);
    const edge = index(120, 1);
    expect(pixels[edge + 3]).toBeGreaterThan(20);
    expect(pixels[edge]).toBeGreaterThan(pixels[edge + 1]!);
    expect(pixels[edge + 1]).toBeGreaterThan(pixels[edge + 2]!);
  } finally {
    image.delete();
    paint.delete();
    shader.delete();
    surface.delete();
    effect.delete();
  }
}, 15000);
