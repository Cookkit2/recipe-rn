// Orange stops from assets/Cookkit.icon/Assets/bg.svg, with a peach highlight.
export const RECIPE_GLOW_COLORS = {
  base: [254 / 255, 51 / 255, 0],
  middle: [1, 111 / 255, 75 / 255],
  highlight: [1, 213 / 255, 173 / 255],
  deep: [248 / 255, 90 / 255, 79 / 255],
};
export const RECIPE_GLOW_ENTER_MS = 400;
export const RECIPE_GLOW_EXIT_MS = 600;
// Slow organic motion needs only 30 uniform updates/s. Fades remain display-rate animations.
export const RECIPE_GLOW_FRAME_MS = 1000 / 30;

function hash(index: number, seed: number) {
  "worklet";
  let value = Math.imul(index ^ seed, 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
}

/** Independent standing modes swell and recede instead of rotating a single bright spot. */
export function recipeGlowModes(milliseconds: number, seed: number) {
  "worklet";
  const time = milliseconds / 1000;
  const weights = [0.34, 0.26, 0.17, 0.1, 0.05, 0.025];
  const cosine: number[] = [];
  const sine: number[] = [];
  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i]!;
    const phaseA = hash(i + 11, seed) * Math.PI * 2;
    const phaseB = hash(i + 31, seed) * Math.PI * 2;
    const phaseC = hash(i + 53, seed) * Math.PI * 2;
    const phaseD = hash(i + 79, seed) * Math.PI * 2;
    const rateA = 0.9 + hash(i + 103, seed) * 1.6;
    const rateB = 1.1 + hash(i + 137, seed) * 1.7;
    cosine.push(
      (0.72 * Math.sin(time * rateA + phaseA) + 0.28 * Math.sin(time * rateA * 0.57 + phaseC)) *
        weight
    );
    sine.push(
      (0.7 * Math.cos(time * rateB + phaseB) + 0.3 * Math.sin(time * rateB * 0.71 + phaseD)) *
        weight
    );
  }
  return { cosine, sine };
}

// One rounded-rectangle distance field keeps side/corner thickness continuous.
// Projecting onto its boundary prevents intersecting waves from forming a second inner halo.
export const RECIPE_GLOW_SHADER = `
    uniform float2 uSize;
    uniform float uRadius;
    uniform float uIntensity;
    uniform float uSpread;
    uniform float uLayering;
    uniform float uVariation;
    uniform float uHighlight;
    uniform float uCos[6];
    uniform float uSin[6];
    uniform float3 uBase;
    uniform float3 uPeach;
    uniform float3 uAmber;
    uniform float3 uEmber;
    half4 main(float2 coordinate) {
      if (uSize.x < 1.0 || uSize.y < 1.0) return half4(0.0);
      float2 halfSize = uSize * 0.5;
      float2 p = coordinate - halfSize;
      float2 q = abs(p) - (halfSize - float2(uRadius));
      float sdf = length(max(q, float2(0.0))) + min(max(q.x, q.y), 0.0) - uRadius;
      float d = max(-sdf, 0.0);
      if (sdf > 0.75 || d >= 112.0) {
        return half4(0.0);
      }
      float2 inner = halfSize - float2(uRadius);
      float2 anchor = clamp(p, -inner, inner);
      float2 radial = p - anchor;
      float radialLength = length(radial);
      float2 boundary;
      if (radialLength > 0.0001) {
        boundary = anchor + radial / radialLength * uRadius;
      } else if (q.x > q.y) {
        boundary = float2(p.x < 0.0 ? -halfSize.x : halfSize.x, p.y);
      } else {
        boundary = float2(p.x, p.y < 0.0 ? -halfSize.y : halfSize.y);
      }
      float2 direction = boundary / halfSize;
      direction /= max(length(direction), 0.0001);
      float2 square = float2(direction.x * direction.x - direction.y * direction.y, 2.0 * direction.x * direction.y);
      float2 harmonic = float2(square.x * direction.x - square.y * direction.y, square.x * direction.y + square.y * direction.x);
      float wave = 0.0;
      float tone = 0.0;
      for (int i = 0; i < 6; i++) {
        wave += uCos[i] * harmonic.x + uSin[i] * harmonic.y;
        tone += uCos[i] * harmonic.y - uSin[i] * harmonic.x;
        harmonic = float2(harmonic.x * direction.x - harmonic.y * direction.y, harmonic.x * direction.y + harmonic.y * direction.x);
      }
      float depthContrast = 1.0 - smoothstep(max(uRadius, 48.0) * 0.60, max(uRadius, 48.0) * 0.92, d);
      float swell = smoothstep(-0.62, 0.62, wave * 1.1 * uVariation);
      float warmth = clamp(0.5 + tone * 0.5 * uVariation, 0.04, 0.96);
      float depth = (14.0 + 52.0 * swell) * uSpread;
      float edge = 0.66 * exp(-d / 2.8);
      float core = 0.44 * exp(-pow(d / depth, 1.65));
      float haze = 0.28 * exp(-pow(d / (depth * (1.25 + 0.35 * warmth)), 2.0));
      float rim = 0.32 * exp(-d / 0.65);
      float alpha = min(0.98, edge + rim + (core + haze) * depthContrast) * uIntensity;
      alpha *= (1.0 - smoothstep(92.0, 112.0, d)) * (1.0 - smoothstep(-0.65, 0.65, sdf));
      float peach = edge * 0.6 + rim * 0.5;
      float amber = core * (0.3 + 0.8 * warmth);
      float base = core * (1.1 - 0.6 * warmth) + edge * 0.4;
      float ember = haze * (0.7 - 0.25 * warmth);
      float3 layered = (uPeach * peach + uAmber * amber + uBase * base + uEmber * ember) / max(peach + amber + base + ember, 0.00001);
      float3 color = mix(uBase, layered, uLayering);
      float amberDepth = max(2.0, depth * (0.62 + 0.15 * swell));
      float peachDepth = max(2.0, depth * (0.27 + 0.18 * warmth));
      float amberCoat = 0.48 * exp(-pow(d / amberDepth, 1.7)) * uHighlight;
      float peachCoat = 0.78 * exp(-pow(d / peachDepth, 1.55)) * uHighlight;
      float3 amberTint = mix(uBase, uAmber, 0.25 + 0.65 * warmth);
      float3 peachTint = mix(uAmber, uPeach, 0.35 + 0.55 * (1.0 - warmth));
      float coatMask = depthContrast * (1.0 - smoothstep(-0.65, 0.65, sdf)) * sqrt(uIntensity);
      amberCoat *= coatMask;
      peachCoat *= coatMask;
      float glint = 0.18 * exp(-d / 1.2) * uHighlight * coatMask;
      float3 premultiplied = color * alpha;
      premultiplied = premultiplied * (1.0 - amberCoat) + amberTint * amberCoat;
      alpha += (1.0 - alpha) * amberCoat;
      premultiplied = premultiplied * (1.0 - peachCoat) + peachTint * peachCoat;
      alpha += (1.0 - alpha) * peachCoat;
      premultiplied = premultiplied * (1.0 - glint) + uPeach * glint;
      alpha += (1.0 - alpha) * glint;
      return half4(premultiplied, alpha);
    }
  `;
