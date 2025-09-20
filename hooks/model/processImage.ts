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

// const createAlphaMaskImage = (mask: Float32Array) => {
//   "worklet";
//   try {
//     // Faster than Array#map on TypedArrays and avoids intermediate arrays
//     const alphaData = new Uint8Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
//     for (let i = 0; i < MODEL_INPUT_SIZE * MODEL_INPUT_SIZE; i++) {
//       const v = mask[i] || 0;
//       alphaData[i] = v <= 0 ? 0 : v >= 1 ? 255 : Math.round(v * 255);
//     }

//     const data = Skia.Data.fromBytes(alphaData);
//     // For ColorType.Alpha_8, bytesPerRow must be width * 1 (one byte per pixel)
//     const maskImage = Skia.Image.MakeImage(
//       {
//         width: MODEL_INPUT_SIZE,
//         height: MODEL_INPUT_SIZE,
//         alphaType: AlphaType.Unpremul,
//         colorType: ColorType.Alpha_8,
//       },
//       data,
//       MODEL_INPUT_SIZE
//     );

//     return maskImage || null;
//   } catch (error) {
//     console.error("Error creating alpha mask image:", error);
//     return null;
//   }
// };

// const expandBbox = (
//   bbox: [number, number, number, number],
//   imageWidth: number,
//   imageHeight: number,
//   paddingRatio: number = 0.15
// ): [number, number, number, number] => {
//   const [x1, y1, x2, y2] = bbox;
//   const width = Math.max(1, x2 - x1);
//   const height = Math.max(1, y2 - y1);
//   const padX = Math.max(4, Math.round(width * paddingRatio));
//   const padY = Math.max(4, Math.round(height * paddingRatio));

//   const nx1 = Math.max(0, Math.floor(x1 - padX));
//   const ny1 = Math.max(0, Math.floor(y1 - padY));
//   const nx2 = Math.min(imageWidth, Math.ceil(x2 + padX));
//   const ny2 = Math.min(imageHeight, Math.ceil(y2 + padY));

//   return [nx1, ny1, nx2, ny2];
// };

// const applyBboxAndCrop = (
//   image: SkImage,
//   bbox: [number, number, number, number]
// ): { finalImage: SkImage; base64: string } => {
//   const expandedBbox = expandBbox(bbox, image.width(), image.height(), 0.15);

//   const [rawX1, rawY1, rawX2, rawY2] = expandedBbox;
//   const x1 = Math.max(0, Math.floor(rawX1));
//   const y1 = Math.max(0, Math.floor(rawY1));
//   const x2 = Math.min(image.width(), Math.ceil(rawX2));
//   const y2 = Math.min(image.height(), Math.ceil(rawY2));

//   const cropWidth = Math.max(1, x2 - x1);
//   const cropHeight = Math.max(1, y2 - y1);

//   try {
//     const surface = Skia.Surface.MakeOffscreen(cropWidth, cropHeight);
//     const canvas = surface?.getCanvas();
//     if (surface && canvas) {
//       const srcRect: SkRect = {
//         x: x1,
//         y: y1,
//         width: cropWidth,
//         height: cropHeight,
//       };
//       const dstRect: SkRect = {
//         x: 0,
//         y: 0,
//         width: cropWidth,
//         height: cropHeight,
//       };
//       const paint = Skia.Paint();
//       paint.setAntiAlias(true);
//       canvas.drawImageRect(image, srcRect, dstRect, paint);
//       const snapshot = surface.makeImageSnapshot();
//       const base64 = snapshot?.encodeToBase64(ImageFormat.PNG, 85);
//       const imageData = Skia.Data.fromBase64(base64 ?? "");
//       const finalImage = Skia.Image.MakeImageFromEncoded(imageData);

//       return { finalImage: finalImage ?? image, base64 };
//     }
//     return {
//       finalImage: image,
//       base64: image.encodeToBase64(ImageFormat.PNG, 85),
//     };
//   } catch (e) {
//     console.warn("Crop failed, returning original image:", e);
//     const base64 = image.encodeToBase64(ImageFormat.PNG, 85);

//     return { finalImage: image, base64 };
//   }
// };

// const applyMaskAndExport = async (image: SkImage, mask: Uint8Array) => {
//   "worklet";
//   try {
//     const data = Skia.Data.fromBytes(mask);

//     const maskImage = Skia.Image.MakeImage(
//       {
//         width: 256,
//         height: 256,
//         alphaType: AlphaType.Opaque,
//         colorType: ColorType.Alpha_8,
//       },
//       data,
//       256
//     );

//     if (maskImage == null) {
//       return;
//     }
//     const srcRect: SkRect = {
//       x: 0,
//       y: 0,
//       width: SEG_MODEL_INPUT_SIZE,
//       height: SEG_MODEL_INPUT_SIZE,
//     };

//     const width = image.width();
//     const height = image.height();
//     const dstRect: SkRect = {
//       x: 0,
//       y: 0,
//       width,
//       height,
//     };

//     const paintSrcIn = Skia.Paint();
//     paintSrcIn.setBlendMode(BlendMode.SrcIn);

//     const paintMask = Skia.Paint();
//     let filter = Skia.ImageFilter.MakeErode(7, 7, null);
//     filter = Skia.ImageFilter.MakeBlur(5, 5, TileMode.Clamp, filter);
//     paintMask.setImageFilter(filter);

//     const auxiliarySkiaSurface = Skia.Surface.MakeOffscreen(width, height);

//     const auxiliaryCanvas = auxiliarySkiaSurface?.getCanvas();

//     auxiliaryCanvas?.drawImageRect(maskImage, srcRect, dstRect, paintMask);
//     auxiliaryCanvas?.drawImage(image, 0, 0, paintSrcIn);
//     const snapshot = auxiliarySkiaSurface?.makeImageSnapshot();

//     // // Create alpha mask image with smoothing applied
//     // const alphaMask = createAlphaMaskImage(mask);
//     // if (!alphaMask) throw new Error("Failed to create alpha mask image");

//     // // Create surface for compositing
//     // const surface = Skia.Surface.MakeOffscreen(width, height);
//     // if (!surface) {
//     //   throw new Error("Failed to create offscreen surface");
//     // }

//     // const canvas = surface.getCanvas();

//     // // 1) Draw the mask first with smoothing/blur (destination becomes the mask alpha)
//     // const paintMask = Skia.Paint();
//     // const blurFilter = Skia.ImageFilter.MakeBlur(3, 3, TileMode.Clamp, null);
//     // paintMask.setImageFilter(blurFilter);
//     // paintMask.setAntiAlias(true);

//     // const srcRect = {
//     //   x: 0,
//     //   y: 0,
//     //   width: MODEL_INPUT_SIZE,
//     //   height: MODEL_INPUT_SIZE,
//     // } as const;
//     // const dstRect = { x: 0, y: 0, width, height } as const;
//     // canvas.drawImageRect(alphaMask, srcRect, dstRect, paintMask);

//     // // 2) Draw the original image using SrcIn so it's clipped by existing destination alpha
//     // const paintSrcIn = Skia.Paint();
//     // paintSrcIn.setBlendMode(BlendMode.SrcIn);
//     // canvas.drawImage(image, 0, 0, paintSrcIn);

//     // // Create snapshot and encode optimally
//     // const snapshot = surface.makeImageSnapshot();

//     // // Use JPEG format with high quality for better performance (PNG is slower)
//     // // and add transparency support by using PNG only when necessary
//     // // const hasTransparency = true; // Since we're applying a mask, we need transparency
//     // // const format = hasTransparency ? ImageFormat.PNG : ImageFormat.JPEG;
//     // // const quality = hasTransparency ? 90 : 85; // Slightly lower quality for better performance

//     // // const base64 = snapshot.encodeToBase64(format, quality);
//     // // const extension = hasTransparency ? "png" : "jpg";
//     // // const filename = `masked-${Date.now()}.${extension}`;
//     // // const outPath = `${FileSystem.cacheDirectory || ""}${filename}`;

//     // // Write to cache asynchronously for better performance
//     // await FileSystem.writeAsStringAsync(outPath, base64, {
//     //   encoding: FileSystem.EncodingType.Base64,
//     // });
//     const base64 = snapshot?.encodeToBase64(ImageFormat.PNG, 85);
//     const imageData = Skia.Data.fromBase64(base64 ?? "");
//     const finalImage = Skia.Image.MakeImageFromEncoded(imageData);
//     // const filename = `masked-${Date.now()}.png`;
//     // const outPath = `${FileSystem.cacheDirectory || ""}${filename}`;

//     // // Write to cache asynchronously for better performance
//     // await FileSystem.writeAsStringAsync(outPath, base64 ?? "", {
//     //   encoding: FileSystem.EncodingType.Base64,
//     // });

//     return { finalImage, base64 };
//     // return snapshot;
//   } catch (error) {
//     console.error("Error applying mask and exporting:", error);
//     return null;
//   }
// };

// const createMaskOverlay = (mask: Float32Array) => {
//   try {
//     // Create RGBA data from the segmentation mask
//     const rgbaData = new Uint8Array(MODEL_INPUT_SIZE * MODEL_INPUT_SIZE * 4);

//     for (let i = 0; i < MODEL_INPUT_SIZE * MODEL_INPUT_SIZE; i++) {
//       const maskValue = Math.floor(
//         Math.max(0, Math.min(1, mask[i] || 0)) * 255
//       ); // Clamp and convert to 0-255 range
//       const rgbaIndex = i * 4;

//       // Create colored overlay where segmented areas are highlighted
//       // Use red color for better visibility
//       rgbaData[rgbaIndex] = 255; // R - Full red
//       rgbaData[rgbaIndex + 1] = 100; // G - Some green
//       rgbaData[rgbaIndex + 2] = 100; // B - Some blue
//       rgbaData[rgbaIndex + 3] = maskValue * 0.7; // A - Use mask value for alpha (semi-transparent)
//     }

//     // Create Skia data from the RGBA array
//     const data = Skia.Data.fromBytes(rgbaData);

//     // Create image from the data
//     const maskImage = Skia.Image.MakeImage(
//       {
//         width: MODEL_INPUT_SIZE,
//         height: MODEL_INPUT_SIZE,
//         alphaType: 2, // kPremul_SkAlphaType
//         colorType: 4, // kRGBA_8888_SkColorType
//       },
//       data,
//       MODEL_INPUT_SIZE * 4 // bytes per row
//     );

//     console.log("Mask overlay created successfully:", {
//       maskDimensions: `${MODEL_INPUT_SIZE}x${MODEL_INPUT_SIZE}`,
//       dataSize: rgbaData.length,
//       imageCreated: !!maskImage,
//     });

//     return maskImage || null;
//   } catch (error) {
//     console.error("Error creating mask overlay:", error);
//     return null;
//   }
// };
