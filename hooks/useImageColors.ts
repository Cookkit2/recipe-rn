import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import useColors from './useColor';
import { getColors } from 'react-native-image-colors';
import { log } from '~/utils/logger';

export interface UseImageColorsOptions {
  /** Stable key for color cache (e.g. recipe id). Uses url.toString() when not set. */
  cacheKey?: string;
}

/**
 * Extracts a dominant color from an image for use as background or accent.
 *
 * Fetches the image asynchronously and picks a color by platform:
 * - **Android**: palette vibrant
 * - **iOS**: palette background
 * - **Web/other**: dominant, or `#4ECDC4` if none
 *
 * Results are cached (by `options.cacheKey` or derived from `url`). On error or
 * when `url` is undefined, returns the theme muted color or `#4ECDC4`.
 *
 * @param url - Image URL or `ImageSourcePropType`. Omit to skip extraction (returns theme muted).
 * @param options - Optional. `cacheKey`: stable key for caching (e.g. recipe id); defaults to url.
 * @returns Hex color string. Theme muted at first, then extracted or fallback color.
 *
 * @example
 * const color = useImageColors(imageUrl);
 * <View style={{ backgroundColor: color }} />
 *
 * @example
 * const color = useImageColors(recipe.imageUrl, { cacheKey: recipe.id });
 */
const useImageColors = (
  url: string | ImageSourcePropType | undefined,
  options?: UseImageColorsOptions
) => {
  const colors = useColors();
  const [imageColor, setImageColor] = useState<string>(colors.muted);
  const cacheKey = options?.cacheKey;

  useEffect(() => {
    const fetchColors = async (url: string | ImageSourcePropType) => {
      try {
        const key =
          cacheKey ??
          (typeof url === "string" ? url : (url as { uri?: string })?.uri ?? String(url));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const color = await getColors(url as any, {
          cache: true,
          key,
        });

        switch (color.platform) {
          case 'android':
            setImageColor(color.vibrant);
            break;
          case 'ios':
            setImageColor(color.background);
            break;
          default:
            setImageColor(color.dominant || '#4ECDC4');
            break;
        }
      } catch (error) {
        log.error('Error fetching image colors:', error);
        // Fallback color
        setImageColor('#4ECDC4');
      }
    };

    if (url) {
      fetchColors(url);
    }
  }, [url, cacheKey]);

  return imageColor;
};
export default useImageColors;
