import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import { getColors } from "react-native-image-colors";

const useImageColors = (url: string | ImageSourcePropType | undefined) => {
  const [imageColor, setImageColor] = useState<string | null>(null);

  useEffect(() => {
    const fetchColors = async (url: string | ImageSourcePropType) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const color = await getColors(url as any , {
        cache: true,
        key: url.toString(),
      });

      switch (color.platform) {
        case "android":
          setImageColor(color.vibrant);
          break;
        case "ios":
          setImageColor(color.background);
      }
    };

    if (url) {
      try {
        // It is only available on native run
        fetchColors(url);
      } catch (error) {
        console.error("Error fetching image colors", error);
        // Fail silently
      }
    }
  }, [url]);

  return imageColor;
};
export default useImageColors;
