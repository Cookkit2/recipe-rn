export interface RecipeLoadingGlowSurfaceProps {
  active: boolean;
  reducedMotion: boolean;
}

// Web retains the existing recipe skeleton; the native renderer needs no web WASM bootstrap.
export default function RecipeLoadingGlowSurface(_props: RecipeLoadingGlowSurfaceProps) {
  return null;
}
