import { Skia, type SkImage } from "@shopify/react-native-skia";

export const loadImageIntoSkia = async (imageUri: string) => {
  const imageData = await Skia.Data.fromURI(imageUri);
  const image = Skia.Image.MakeImageFromEncoded(imageData);
  return image;
};

export const preprocessImage = (image: SkImage, imageSize: number) => {
  "worklet";
  // Create offscreen surface at target size and draw scaled image
  const surface = Skia.Surface.MakeOffscreen(imageSize, imageSize);
  if (!surface) {
    throw new Error("Failed to create surface");
  }

  const canvas = surface.getCanvas();
  const srcRect = {
    x: 0,
    y: 0,
    width: image.width(),
    height: image.height(),
  } as const;
  const dstRect = { x: 0, y: 0, width: imageSize, height: imageSize } as const;
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  canvas.drawImageRect(image, srcRect, dstRect, paint);

  const snapshot = surface.makeImageSnapshot();
  const pixelData = snapshot?.readPixels();

  if (!pixelData) {
    throw new Error("Failed to read pixels");
  }

  // Convert RGBA to RGB Float32Array
  const rgbData = new Float32Array(imageSize * imageSize * 3);
  for (let i = 0; i < imageSize * imageSize; i++) {
    const rgbaIndex = i * 4;
    const rgbIndex = i * 3;

    rgbData[rgbIndex] = (pixelData[rgbaIndex] || 0) / 255.0; // R
    rgbData[rgbIndex + 1] = (pixelData[rgbaIndex + 1] || 0) / 255.0; // G
    rgbData[rgbIndex + 2] = (pixelData[rgbaIndex + 2] || 0) / 255.0; // B
  }

  // Optionally dispose surface to free memory
  // surface.dispose?.();

  return rgbData;
};
