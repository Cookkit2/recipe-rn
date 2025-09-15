import {
  AlphaType,
  BlendMode,
  ColorType,
  ImageFormat,
  Skia,
  TileMode,
  type SkImage,
  type SkRect,
} from "@shopify/react-native-skia";
import { postprocessOutputsYolo } from "./yolo-function";
import allModel from "./allModel";
import type { SegmentedImage } from "~/app/ingredient/(create)/create";

// const SEG_MODEL_INPUT_SIZE = 256;
const VEGE_MODEL_INPUT_SIZE = 512;
// const VEGE_MODEL_INPUT_SIZE = 512;
const MAGIC_TOUCH_MODEL_INPUT_SIZE = 512;

export const segmentStaticImage = async (
  imageUri: string,
  coordinate: { x: number; y: number }
): Promise<SegmentedImage | null> => {
  const { vegeModel, magicTouchModel } = await allModel.get();

  try {
    const startTime = performance.now();
    // console.log("Processing image for segmentation:", imageUri);

    const skImage = await loadImageIntoSkia(imageUri);

    if (!skImage) {
      throw new Error("Failed to load image");
    }

    // const pixelData = snapShotImage(skImage, VEGE_MODEL_INPUT_SIZE);

    // if (!pixelData) {
    //   throw new Error("Failed to read pixels");
    // }

    const vegetableData = preprocessImage(skImage, VEGE_MODEL_INPUT_SIZE);
    const input = preprocessMagicTouchInput(
      skImage,
      // MAGIC_TOUCH_MODEL_INPUT_SIZE,
      // skImage.width(),
      // skImage.height(),
      {
        x: coordinate.x,
        y: coordinate.y,
      }
    ); // Float32Array length 512*512*4

    // console.log("Image processed successfully");

    // Step 5: Run the model (same as in segment function)
    const [vegetableOutput, magicTouchOutputs] = await Promise.all([
      vegeModel.run([vegetableData]) as Promise<Float32Array[]>,
      magicTouchModel.run([input]) as Promise<Float32Array[]>,
    ]);

    const detections = postprocessOutputsYolo(vegetableOutput, [
      skImage.height(),
      skImage.width(),
    ]);

    // console.log("Magic touch outputs:", magicTouchOutputs[0]?.length);

    // console.log("Best class:", detections[0]?.className);

    const hasDetections = Array.isArray(detections) && detections.length > 0;
    const topDetection = hasDetections
      ? detections.reduce((prev, curr) =>
          (prev?.confidence ?? 0) >= (curr?.confidence ?? 0) ? prev : curr
        )
      : null;
    const quantity =
      hasDetections && topDetection
        ? detections.filter((d) => d.classId === topDetection.classId).length
        : 1;
    const unit = "units";

    if (magicTouchOutputs[0]) {
      const magicMaskOutputs = await applyMagicTouchMaskAndExport(
        skImage,
        magicTouchOutputs[0]
      );

      // console.log(
      //   "Magic mask outputs:",
      //   magicMaskOutputs?.finalImage?.getImageInfo()
      // );

      const endTime = performance.now();
      const duration = endTime - startTime;

      console.log(`applyMagicTouchMaskAndExport took ${duration} milliseconds`);

      if (
        magicMaskOutputs &&
        magicMaskOutputs.finalImage &&
        magicMaskOutputs.base64
      ) {
        return {
          name: topDetection?.className ?? "Unknown",
          quantity: quantity,
          unit: unit,
          // base64: magicMaskOutputs.base64,
          skImage: magicMaskOutputs.finalImage,
        };
      }
    }

    return {
      name: "Unknown",
      quantity: 1,
      unit: "units",
      // base64: skImage.encodeToBase64(ImageFormat.PNG, 85),
      skImage: skImage,
    };
  } catch (error) {
    console.error("Error processing static image:", error);
    return null;
  }
};

const loadImageIntoSkia = async (imageUri: string) => {
  const imageData = await Skia.Data.fromURI(imageUri);
  const image = Skia.Image.MakeImageFromEncoded(imageData);
  return image;
};

const snapShotImage = (image: SkImage, imageSize: number) => {
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

  surface.dispose?.();

  return pixelData;
};

const preprocessImage = (image: SkImage, imageSize: number) => {
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

/**
 * Preprocess an image and an optional touch point for Google's Magic Touch model.
 * Returns a Float32Array laid out as NHWC with 4 channels (RGBA-like),
 * where the 4th channel is a Gaussian guidance map centered at the touch point.
 * Shape: [1, imageSize, imageSize, 4] when consumed by TFLite (flat buffer length imageSize*imageSize*4).
 */
export const preprocessMagicTouchInput = (
  image: SkImage,
  // pixelData: Float32Array<ArrayBufferLike> | Uint8Array<ArrayBufferLike>,
  // imageSize: number,
  // imageWidth: number,
  // imageHeight: number,
  touch?: { x: number; y: number },
  options?: { sigma?: number }
) => {
  "worklet";
  const imageSize = MAGIC_TOUCH_MODEL_INPUT_SIZE;
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

  const out = new Float32Array(imageSize * imageSize * 4);

  // Compute scaled touch coordinate into the preprocessed image space
  let tx = -1;
  let ty = -1;
  if (touch) {
    tx = (touch.x / image.width()) * imageSize;
    ty = (touch.y / image.height()) * imageSize;
  }

  // Build guidance channel using Skia blur of a small white circle
  const blurSigma = options?.sigma ?? Math.max(8, Math.round(imageSize * 0.03));
  let guidanceAlpha: Uint8Array | null = null;
  if (tx >= 0 && ty >= 0) {
    const gSurface = Skia.Surface.MakeOffscreen(imageSize, imageSize);
    const gCanvas = gSurface?.getCanvas();
    if (gSurface && gCanvas) {
      // Clear to transparent
      gCanvas.clear(Skia.Color("transparent"));
      const gPaint = Skia.Paint();
      const filter = Skia.ImageFilter.MakeBlur(
        blurSigma,
        blurSigma,
        TileMode.Clamp,
        null
      );
      gPaint.setImageFilter(filter);
      gPaint.setAntiAlias(true);
      // Draw a solid white circle and let the blur create a Gaussian-like falloff
      // Default radius tuned for 512 grid
      const radius = Math.max(2, Math.round(imageSize * 0.01));
      gPaint.setColor(Skia.Color("white"));
      gCanvas.drawCircle(tx, ty, radius, gPaint);
      const gSnap = gSurface.makeImageSnapshot();
      const gPixels = gSnap?.readPixels();
      if (gPixels) {
        guidanceAlpha = new Uint8Array(imageSize * imageSize);
        for (let i = 0; i < imageSize * imageSize; i++) {
          const ai = i * 4 + 3;
          guidanceAlpha[i] = gPixels[ai] || 0;
        }
      }
    }
  }

  for (let i = 0; i < imageSize * imageSize; i++) {
    const rgbaIndex = i * 4;
    const outIndex = rgbaIndex; // 4-channel interleaved

    // RGB normalized to 0..1
    out[outIndex] = (pixelData[rgbaIndex] || 0) / 255.0; // R
    out[outIndex + 1] = (pixelData[rgbaIndex + 1] || 0) / 255.0; // G
    out[outIndex + 2] = (pixelData[rgbaIndex + 2] || 0) / 255.0; // B

    // Guidance from blurred alpha map
    out[outIndex + 3] = guidanceAlpha ? (guidanceAlpha[i] || 0) / 255.0 : 0;
  }

  // surface.dispose?.();
  return out;
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

const convertFloat32ArrayToUint8Array = (float32Array: Float32Array) => {
  // Detect if values are already probabilities [0,1] or logits
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < float32Array.length; i++) {
    const v = float32Array[i] as number;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const needsSigmoid = !(min >= 0 && max <= 1);

  const toByte = (v: number) => {
    const p = needsSigmoid ? 1 / (1 + Math.exp(-v)) : v;
    const clamped = p <= 0 ? 0 : p >= 1 ? 1 : p;
    return Math.round(clamped * 255);
  };

  const output = new Uint8Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    output[i] = toByte(float32Array[i] as number);
  }
  return output;
};

const applyMagicTouchMaskAndExport = async (
  image: SkImage,
  mask: Float32Array
) => {
  "worklet";
  try {
    const data = Skia.Data.fromBytes(convertFloat32ArrayToUint8Array(mask));

    const maskImage = Skia.Image.MakeImage(
      {
        width: MAGIC_TOUCH_MODEL_INPUT_SIZE,
        height: MAGIC_TOUCH_MODEL_INPUT_SIZE,
        alphaType: AlphaType.Opaque,
        colorType: ColorType.Alpha_8,
      },
      data,
      MAGIC_TOUCH_MODEL_INPUT_SIZE
    );

    if (maskImage == null) {
      return;
    }
    const srcRect: SkRect = {
      x: 0,
      y: 0,
      width: MAGIC_TOUCH_MODEL_INPUT_SIZE,
      height: MAGIC_TOUCH_MODEL_INPUT_SIZE,
    };

    const width = image.width();
    const height = image.height();
    const dstRect: SkRect = {
      x: 0,
      y: 0,
      width,
      height,
    };

    const paintSrcIn = Skia.Paint();
    paintSrcIn.setBlendMode(BlendMode.SrcIn);

    const paintMask = Skia.Paint();
    let filter = Skia.ImageFilter.MakeErode(7, 7, null);
    filter = Skia.ImageFilter.MakeBlur(5, 5, TileMode.Clamp, filter);
    paintMask.setImageFilter(filter);

    const auxiliarySkiaSurface = Skia.Surface.MakeOffscreen(width, height);

    const auxiliaryCanvas = auxiliarySkiaSurface?.getCanvas();

    auxiliaryCanvas?.drawImageRect(maskImage, srcRect, dstRect, paintMask);
    auxiliaryCanvas?.drawImage(image, 0, 0, paintSrcIn);
    const snapshot = auxiliarySkiaSurface?.makeImageSnapshot();

    const base64 = snapshot?.encodeToBase64(ImageFormat.PNG, 85);
    const imageData = Skia.Data.fromBase64(base64 ?? "");
    const finalImage = Skia.Image.MakeImageFromEncoded(imageData);

    return { finalImage, base64 };
    // return snapshot;
  } catch (error) {
    console.error("Error applying mask and exporting:", error);
    return null;
  }
};

// Util: trim fully transparent borders from a SkImage and return cropped image/base64
export const trimTransparentBorders = (
  image: SkImage,
  padding: number = 0
): { finalImage: SkImage; base64: string } => {
  const imgW = image.width();
  const imgH = image.height();

  // Downscale for fast alpha scan
  const maxScan = 512;
  const scale = Math.min(1, maxScan / Math.max(imgW, imgH));
  const scanW = Math.max(1, Math.round(imgW * scale));
  const scanH = Math.max(1, Math.round(imgH * scale));

  const surface = Skia.Surface.MakeOffscreen(scanW, scanH);
  const canvas = surface?.getCanvas();
  if (!surface || !canvas) {
    return {
      finalImage: image,
      base64: image.encodeToBase64(ImageFormat.PNG, 85),
    };
  }

  const srcRect: SkRect = { x: 0, y: 0, width: imgW, height: imgH };
  const dstRect: SkRect = { x: 0, y: 0, width: scanW, height: scanH };
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  canvas.drawImageRect(image, srcRect, dstRect, paint);

  const snapshot = surface.makeImageSnapshot();
  const pixels = snapshot?.readPixels();
  if (!pixels) {
    return {
      finalImage: image,
      base64: image.encodeToBase64(ImageFormat.PNG, 85),
    };
  }

  let minX = scanW,
    minY = scanH,
    maxX = -1,
    maxY = -1;
  const threshold = 1; // alpha > 0 considered opaque
  for (let y = 0; y < scanH; y++) {
    for (let x = 0; x < scanW; x++) {
      const idx = (y * scanW + x) * 4 + 3;
      const a = pixels[idx] || 0;
      if (a > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If nothing found, return original
  if (maxX < 0 || maxY < 0) {
    return {
      finalImage: image,
      base64: image.encodeToBase64(ImageFormat.PNG, 85),
    };
  }

  // Map scan bbox back to original coordinates
  const scaleX = imgW / scanW;
  const scaleY = imgH / scanH;
  const x1 = Math.max(0, Math.floor(minX * scaleX) - padding);
  const y1 = Math.max(0, Math.floor(minY * scaleY) - padding);
  const x2 = Math.min(imgW, Math.ceil((maxX + 1) * scaleX) + padding);
  const y2 = Math.min(imgH, Math.ceil((maxY + 1) * scaleY) + padding);

  const cropW = Math.max(1, x2 - x1);
  const cropH = Math.max(1, y2 - y1);

  const outSurface = Skia.Surface.MakeOffscreen(cropW, cropH);
  const outCanvas = outSurface?.getCanvas();
  if (!outSurface || !outCanvas) {
    return {
      finalImage: image,
      base64: image.encodeToBase64(ImageFormat.PNG, 85),
    };
  }

  const cropSrc: SkRect = { x: x1, y: y1, width: cropW, height: cropH };
  const cropDst: SkRect = { x: 0, y: 0, width: cropW, height: cropH };
  const outPaint = Skia.Paint();
  outPaint.setAntiAlias(true);
  outCanvas.drawImageRect(image, cropSrc, cropDst, outPaint);

  const outSnap = outSurface.makeImageSnapshot();
  const base64 = outSnap?.encodeToBase64(ImageFormat.PNG, 85);
  const data = Skia.Data.fromBase64(base64 ?? "");
  const finalImage = Skia.Image.MakeImageFromEncoded(data);

  return {
    finalImage: finalImage ?? image,
    base64: base64 ?? image.encodeToBase64(ImageFormat.PNG, 85),
  };
};

// Resize a SkImage to a target width (preserving aspect ratio and alpha)
// Returns both the resized SkImage and PNG base64 data
export const resizeImagePreserveAlpha = (
  image: SkImage,
  targetWidth: number
): { finalImage: SkImage; base64: string } => {
  const imgW = image.width();
  const imgH = image.height();

  if (targetWidth <= 0 || imgW <= targetWidth) {
    return {
      finalImage: image,
      base64: image.encodeToBase64(ImageFormat.PNG, 85),
    };
  }

  const scale = targetWidth / imgW;
  const newW = Math.max(1, Math.round(imgW * scale));
  const newH = Math.max(1, Math.round(imgH * scale));

  const surface = Skia.Surface.MakeOffscreen(newW, newH);
  const canvas = surface?.getCanvas();
  if (!surface || !canvas) {
    return {
      finalImage: image,
      base64: image.encodeToBase64(ImageFormat.PNG, 85),
    };
  }

  const srcRect: SkRect = { x: 0, y: 0, width: imgW, height: imgH };
  const dstRect: SkRect = { x: 0, y: 0, width: newW, height: newH };
  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  canvas.drawImageRect(image, srcRect, dstRect, paint);

  const snapshot = surface.makeImageSnapshot();
  const base64 = snapshot?.encodeToBase64(ImageFormat.PNG, 85);
  const data = Skia.Data.fromBase64(base64 ?? "");
  const finalImage = Skia.Image.MakeImageFromEncoded(data);

  return {
    finalImage: finalImage ?? image,
    base64: base64 ?? image.encodeToBase64(ImageFormat.PNG, 85),
  };
};

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
