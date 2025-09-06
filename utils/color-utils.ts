export function hslToHsla(hslString: string, alpha: number = 1): string {
  // Extract h, s, l values from the HSL string
  const hslMatch = hslString.match(
    /hsl\(\s*(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)%\s*,?\s*(\d+(?:\.\d+)?)%\s*\)/
  );
  if (!hslMatch) {
    throw new Error(`Invalid HSL format: ${hslString}`);
  }
  const h = Number(hslMatch[1]!);
  const s = Number(hslMatch[2]!);
  const l = Number(hslMatch[3]!);

  return `hsla(${h}, ${s}%, ${l}%, ${alpha})`;
}
