import { useEffect, useState } from "react";
import { getColors } from "react-native-image-colors";

const useImageColors = (url: string | undefined) => {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    const fetchColors = async (url: string) => {
      const color = await getColors(url, {
        cache: true,
        key: url,
      });

      const temp =
        color.platform === "android"
          ? color.lightMuted
          : color.platform === "ios"
            ? color.background
            : color.lightMuted;

      setColor(temp);
    };

    if (url) {
      fetchColors(url);
    }
  }, [url]);

  return color;
};
export default useImageColors;
