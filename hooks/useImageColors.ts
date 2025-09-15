import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import useColors from "./useColor";
import { getColors } from "react-native-image-colors";

const useImageColors = (url: string | ImageSourcePropType | undefined) => {
  const colors = useColors();
  const [imageColor, setImageColor] = useState<string>(colors.muted);

  useEffect(() => {
    const fetchColors = async (url: string | ImageSourcePropType) => {
      if (!getColors) {
        // Fallback to default colors based on item type or random
        const fallbackColors = [
          "#FF6B6B",
          "#4ECDC4",
          "#45B7D1",
          "#96CEB4",
          "#FFEAA7",
        ];
        const randomColor =
          fallbackColors[Math.floor(Math.random() * fallbackColors.length)] ||
          "#4ECDC4";
        setImageColor(randomColor);
        return;
      }

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const color = await getColors(url as any, {
          cache: true,
          key: url.toString(),
        });

        switch (color.platform) {
          case "android":
            setImageColor(color.vibrant);
            break;
          case "ios":
            setImageColor(color.background);
            break;
          default:
            setImageColor(color.dominant || "#4ECDC4");
            break;
        }
      } catch (error) {
        console.warn("Error fetching image colors, using fallback:", error);
        // Fallback color
        setImageColor("#4ECDC4");
      }
    };

    if (url) {
      fetchColors(url);
    }
  }, [url]);

  return imageColor;
};
export default useImageColors;
