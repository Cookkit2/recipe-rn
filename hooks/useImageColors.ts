import { useEffect, useState } from "react";
import type { ImageSourcePropType } from "react-native";
import useColors from "./useColor";
import { getColors } from "react-native-image-colors";

// Try to import the native module with fallback
// let getColors: any = null;
// try {
//   const imageColors = require("react-native-image-colors");
//   getColors = imageColors.getColors;
// } catch (error) {
//   console.warn("react-native-image-colors not available, using fallback");
//   getColors = null;
// }

const useImageColors = (url: string | ImageSourcePropType | undefined) => {
  const colors = useColors();
  const [imageColor, setImageColor] = useState<string>(colors.muted);

  useEffect(() => {
    const fetchColors = async (url: string | ImageSourcePropType) => {
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
