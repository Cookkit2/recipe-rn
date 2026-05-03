import { Skia, type SkImage } from "@shopify/react-native-skia";

/**
 * Loads an image from a URI into a Skia image object for processing.
 *
 * This function decodes the image data from the given URI and creates
 * a Skia image object that can be used for further processing operations.
 *
 * @param imageUri The URI path to the image file
 * @returns A Skia image object, or null if the image could not be decoded
 *
 * @example
 * const skiaImage = await loadImageIntoSkia("/path/to/image.jpg");
 * if (skiaImage) {
 *   const processed = preprocessImage(skiaImage, 224);
 * }
 */
export const loadImageIntoSkia = async (imageUri: string) => {
  const imageData = await Skia.Data.fromURI(imageUri);
  return Skia.Image.MakeImageFromEncoded(imageData);
};

/**
 * Preprocesses an image for ML model inference by resizing and normalizing pixel data.
 *
 * This function implements the standard ML image preprocessing pipeline:
 * 1. Creates an offscreen surface at the target model input size
 * 2. Draws the source image scaled to fit the target size (aspect ratio ignored)
 * 3. Reads the pixel data as RGBA bytes
 * 4. Converts to RGB Float32Array normalized to [0, 1] range
 *
 * The output format matches common ML model input requirements (e.g., MobileNet, ResNet).
 * Note: This is a worklet function and can run on the UI thread for better performance.
 *
 * @param image The source Skia image to preprocess
 * @param imageSize The target width and height in pixels (e.g., 224 for MobileNet)
 * @returns Float32Array of shape [imageSize, imageSize, 3] with RGB values in [0, 1] range
 * @throws {Error} If surface creation fails or pixel reading fails
 *
 * @example
 * // Preprocess for MobileNet input (224x224)
 * const image = await loadImageIntoSkia(uri);
 * const inputTensor = preprocessImage(image, 224);
 * // inputTensor is now Float32Array[224*224*3] ready for model inference
 */
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
