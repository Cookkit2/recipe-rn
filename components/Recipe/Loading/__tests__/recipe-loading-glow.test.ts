import { recipeGlowModes } from "../recipe-loading-glow";

it("has independently changing peaks rather than a fixed rotating wave", () => {
  const first = recipeGlowModes(0, 1024);
  expect(recipeGlowModes(0, 1024)).toEqual(first);
  expect(recipeGlowModes(0, 2048)).not.toEqual(first);
  const later = recipeGlowModes(2000, 1024);
  const energy = (modes: ReturnType<typeof recipeGlowModes>) =>
    modes.cosine.map((value, i) => Math.hypot(value, modes.sine[i]!));
  // A rigid rotation preserves every harmonic's amplitude. These amplitudes change independently.
  expect(
    energy(later).filter((value, i) => Math.abs(value - energy(first)[i]!) > 0.001).length
  ).toBeGreaterThan(3);
  for (const value of [...later.cosine, ...later.sine]) {
    expect(Number.isFinite(value)).toBe(true);
    expect(Math.abs(value)).toBeLessThanOrEqual(0.34);
  }
});
