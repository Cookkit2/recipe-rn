import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";

// Try to import the native module with fallback
let getColors: any = null;
try {
  const imageColors = require("react-native-image-colors");
  getColors = imageColors.getColors;
} catch (error) {
  console.warn("react-native-image-colors not available, using fallback");
  getColors = null;
}

const useImageColors = (url: string | ImageSourcePropType | undefined) => {
  const [imageColor, setImageColor] = useState<string | null>(null);

  useEffect(() => {
    const fetchColors = async (url: string | ImageSourcePropType) => {
      if (!getColors) {
        // Fallback to default colors based on item type or random
        const fallbackColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];
        const randomColor = fallbackColors[Math.floor(Math.random() * fallbackColors.length)] || '#4ECDC4';
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
            setImageColor(color.dominant || '#4ECDC4');
            break;
        }
      } catch (error) {
        console.warn("Error fetching image colors, using fallback:", error);
        // Fallback color
        setImageColor('#4ECDC4');
      }
    };

    if (url) {
      fetchColors(url);
    } else {
      setImageColor(null);
    }
  }, [url]);

  return imageColor;
};
export default useImageColors;
