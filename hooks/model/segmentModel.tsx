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
import allModel from "./allModel";
import { getColors } from "react-native-image-colors";
import { log } from "~/utils/logger";

const MAGIC_TOUCH_MODEL_INPUT_SIZE = 512;

export const segmentStaticImage = async (
  skImage: SkImage,
  coordinate: { x: number; y: number }
) => {
  // Step 1: Model Loading
  const { magicTouchModel } = await allModel.get();

  try {
    // Step 2: Preprocessing Input
    const input = preprocessMagicTouchInput(skImage, {
      x: coordinate.x,
      y: coordinate.y,
    }); // Float32Array length 512*512*4

    // Step 3: Model Inference
    const magicTouchOutputs = magicTouchModel.runSync([input.buffer]);

    let returnSkImage: SkImage = skImage;

    // Step 4: Applying Mask
    if (magicTouchOutputs[0]) {
      const magicMaskOutputs = applyMagicTouchMaskAndExport(
        skImage,
        new Float32Array(magicTouchOutputs[0])
      );

      if (magicMaskOutputs?.finalImage) {
        returnSkImage = magicMaskOutputs?.finalImage;
      }
    }

    // Step 5: Create Thumbnail for Color Extraction
    // Using a tiny 32x32 PNG thumbnail for fast color extraction
    const thumbnailBase64 = createThumbnailForColors(returnSkImage, 32);
    const url = `data:image/png;base64,${thumbnailBase64}`;

    // Step 6: Color Extraction
    const backgroundColor = await fetchColors(url);

    return {
      background_color: backgroundColor,
      skImage: returnSkImage,
    };
  } catch (error) {
    log.error("[create-camera] segmentStaticImage failed", error);
    return {
      background_color: undefined,
      skImage: skImage,
    };
  }
};

export const fetchColors = async (url: string) => {
  try {
    const color = await getColors(url, {
      cache: true,
      key: url,
      fallback: "#f4f4f5",
    });

    switch (color.platform) {
      case "android":
        return color.vibrant;
      case "ios":
        return color.background;
    }
  } catch (error) {
    log.warn("Error fetching image colors, using fallback:", error);
    return "#f4f4f5";
  }
};

/**
 * Create a small thumbnail for fast color extraction
 * Using a tiny 32x32 PNG is much faster than encoding larger images
 */
const createThumbnailForColors = (image: SkImage, size: number = 32): string => {
  "worklet";
  const surface = Skia.Surface.MakeOffscreen(size, size);
  if (!surface) {
    throw new Error("Failed to create thumbnail surface");
  }

  const canvas = surface.getCanvas();
  const srcRect = {
    x: 0,
    y: 0,
    width: image.width(),
    height: image.height(),
  } as const;
  const dstRect = { x: 0, y: 0, width: size, height: size } as const;
  const paint = Skia.Paint();
  paint.setAntiAlias(false);
  canvas.drawImageRect(image, srcRect, dstRect, paint);

  const snapshot = surface.makeImageSnapshot();
  const base64 = snapshot?.encodeToBase64(ImageFormat.PNG, 60);

  return base64 ?? "";
};

/**
 * Preprocess an image and an optional touch point for Google's Magic Touch model.
 * Returns a Float32Array laid out as NHWC with 4 channels (RGBA-like),
 * where the 4th channel is a Gaussian guidance map centered at the touch point.
 * Shape: [1, imageSize, imageSize, 4] when consumed by TFLite (flat buffer length imageSize*imageSize*4).
 */
export const preprocessMagicTouchInput = (
  image: SkImage,
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
  paint.setAntiAlias(false);
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
      gCanvas.clear(Skia.Color("transparent"));
      const gPaint = Skia.Paint();
      const filter = Skia.ImageFilter.MakeBlur(blurSigma, blurSigma, TileMode.Clamp, null);
      gPaint.setImageFilter(filter);
      gPaint.setAntiAlias(true);
      const radius = Math.max(2, Math.round(imageSize * 0.01));
      gPaint.setColor(Skia.Color("white"));
      gCanvas.drawCircle(tx, ty, radius, gPaint);
      const gSnap = gSurface.makeImageSnapshot();
      const gPixels = gSnap?.readPixels();
      if (gPixels) {
        guidanceAlpha = new Uint8Array(imageSize * imageSize);
        for (let i = 0; i < imageSize * imageSize; i++) {
          guidanceAlpha[i] = gPixels[i * 4 + 3] || 0;
        }
      }
    }
  }

  // Single pass: normalize RGB and add guidance
  // Branch once outside the loop to avoid per-pixel conditional
  const invScale = 1 / 255;
  const totalPixels = imageSize * imageSize;
  if (guidanceAlpha) {
    for (let i = 0; i < totalPixels; i++) {
      const rgbaIndex = i * 4;
      out[rgbaIndex] = (pixelData[rgbaIndex] || 0) * invScale;
      out[rgbaIndex + 1] = (pixelData[rgbaIndex + 1] || 0) * invScale;
      out[rgbaIndex + 2] = (pixelData[rgbaIndex + 2] || 0) * invScale;
      out[rgbaIndex + 3] = (guidanceAlpha[i] || 0) * invScale;
    }
  } else {
    for (let i = 0; i < totalPixels; i++) {
      const rgbaIndex = i * 4;
      out[rgbaIndex] = (pixelData[rgbaIndex] || 0) * invScale;
      out[rgbaIndex + 1] = (pixelData[rgbaIndex + 1] || 0) * invScale;
      out[rgbaIndex + 2] = (pixelData[rgbaIndex + 2] || 0) * invScale;
      out[rgbaIndex + 3] = 0;
    }
  }

  return out;
};

const convertFloat32ArrayToUint8Array = (float32Array: Float32Array) => {
  "worklet";
  // Detect if values are already probabilities [0,1] or logits
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  // Sample a subset for faster min/max detection
  const sampleStep = Math.max(1, Math.floor(float32Array.length / 1000));
  for (let i = 0; i < float32Array.length; i += sampleStep) {
    const v = float32Array[i] as number;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const needsSigmoid = !(min >= 0 && max <= 1);

  const output = new Uint8Array(float32Array.length);

  if (needsSigmoid) {
    // Use lookup table for sigmoid approximation (faster for large arrays)
    for (let i = 0; i < float32Array.length; i++) {
      const v = float32Array[i] as number;
      // Clamp to avoid overflow in exp
      const clamped = v < -10 ? -10 : v > 10 ? 10 : v;
      const p = 1 / (1 + Math.exp(-clamped));
      output[i] = Math.round(p * 255);
    }
  } else {
    // Direct conversion for probabilities
    for (let i = 0; i < float32Array.length; i++) {
      const v = float32Array[i] as number;
      const clamped = v <= 0 ? 0 : v >= 1 ? 1 : v;
      output[i] = Math.round(clamped * 255);
    }
  }

  return output;
};

const applyMagicTouchMaskAndExport = (image: SkImage, mask: Float32Array) => {
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

    const width = image.width();
    const height = image.height();

    // OPTIMIZED: Apply erode/blur at model resolution (512x512) instead of full image size
    // Then upscale the processed mask
    const maskSurface = Skia.Surface.MakeOffscreen(
      MAGIC_TOUCH_MODEL_INPUT_SIZE,
      MAGIC_TOUCH_MODEL_INPUT_SIZE
    );
    const maskCanvas = maskSurface?.getCanvas();
    if (!maskSurface || !maskCanvas) {
      return null;
    }

    const paintMask = Skia.Paint();
    // Apply erode and blur at smaller resolution (much faster)
    let filter = Skia.ImageFilter.MakeErode(3, 3, null);
    filter = Skia.ImageFilter.MakeBlur(2, 2, TileMode.Clamp, filter);
    paintMask.setImageFilter(filter);
    maskCanvas.drawImage(maskImage, 0, 0, paintMask);
    const processedMask = maskSurface.makeImageSnapshot();

    if (!processedMask) {
      return null;
    }

    // Now composite at full resolution
    const srcRect: SkRect = {
      x: 0,
      y: 0,
      width: MAGIC_TOUCH_MODEL_INPUT_SIZE,
      height: MAGIC_TOUCH_MODEL_INPUT_SIZE,
    };
    const dstRect: SkRect = {
      x: 0,
      y: 0,
      width,
      height,
    };

    const paintSrcIn = Skia.Paint();
    paintSrcIn.setBlendMode(BlendMode.SrcIn);

    const auxiliarySkiaSurface = Skia.Surface.MakeOffscreen(width, height);
    const auxiliaryCanvas = auxiliarySkiaSurface?.getCanvas();

    // Draw upscaled processed mask, then composite with source image
    const upscalePaint = Skia.Paint();
    upscalePaint.setAntiAlias(false);
    auxiliaryCanvas?.drawImageRect(processedMask, srcRect, dstRect, upscalePaint);
    auxiliaryCanvas?.drawImage(image, 0, 0, paintSrcIn);
    const snapshot = auxiliarySkiaSurface?.makeImageSnapshot();

    if (!snapshot) {
      log.error("Failed to create snapshot");
      return null;
    }

    // Create a persistent image from pixel data
    const pixels = snapshot.readPixels();
    if (!pixels) {
      log.error("Failed to read pixels from snapshot");
      return null;
    }

    const pixelBytes = pixels instanceof Uint8Array ? pixels : new Uint8Array(pixels.buffer);
    const pixelData = Skia.Data.fromBytes(pixelBytes);

    const finalImage = Skia.Image.MakeImage(
      {
        width,
        height,
        alphaType: AlphaType.Premul,
        colorType: ColorType.RGBA_8888,
      },
      pixelData,
      width * 4
    );

    if (!finalImage) {
      log.error("Failed to create final image from pixels");
      return null;
    }

    return { finalImage };
  } catch (error) {
    log.error("Error applying mask and exporting:", error);
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

export const trimTransparentBordersAndResizeImage = (
  image: SkImage,
  targetWidth: number,
  padding: number = 0
): { base64: string; width: number; height: number } => {
  const imgW = image.width();
  const imgH = image.height();

  const maxScan = 512;
  const scale = Math.min(1, maxScan / Math.max(imgW, imgH));
  const scanW = Math.max(1, Math.round(imgW * scale));
  const scanH = Math.max(1, Math.round(imgH * scale));

  const surface = Skia.Surface.MakeOffscreen(scanW, scanH);
  const canvas = surface?.getCanvas();
  if (!surface || !canvas) {
    const resized = resizeImagePreserveAlpha(image, targetWidth);
    return {
      base64: resized.base64,
      width: resized.finalImage.width(),
      height: resized.finalImage.height(),
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
    const resized = resizeImagePreserveAlpha(image, targetWidth);
    return {
      base64: resized.base64,
      width: resized.finalImage.width(),
      height: resized.finalImage.height(),
    };
  }

  let minX = scanW;
  let minY = scanH;
  let maxX = -1;
  let maxY = -1;
  const threshold = 1;

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

  if (maxX < 0 || maxY < 0) {
    const resized = resizeImagePreserveAlpha(image, targetWidth);
    return {
      base64: resized.base64,
      width: resized.finalImage.width(),
      height: resized.finalImage.height(),
    };
  }

  const scaleX = imgW / scanW;
  const scaleY = imgH / scanH;
  const x1 = Math.max(0, Math.floor(minX * scaleX) - padding);
  const y1 = Math.max(0, Math.floor(minY * scaleY) - padding);
  const x2 = Math.min(imgW, Math.ceil((maxX + 1) * scaleX) + padding);
  const y2 = Math.min(imgH, Math.ceil((maxY + 1) * scaleY) + padding);

  const cropW = Math.max(1, x2 - x1);
  const cropH = Math.max(1, y2 - y1);
  const outW = Math.max(1, Math.min(targetWidth, cropW));
  const outH = Math.max(1, Math.round((cropH / cropW) * outW));

  const outSurface = Skia.Surface.MakeOffscreen(outW, outH);
  const outCanvas = outSurface?.getCanvas();
  if (!outSurface || !outCanvas) {
    const resized = resizeImagePreserveAlpha(image, targetWidth);
    return {
      base64: resized.base64,
      width: resized.finalImage.width(),
      height: resized.finalImage.height(),
    };
  }

  const cropSrc: SkRect = { x: x1, y: y1, width: cropW, height: cropH };
  const cropDst: SkRect = { x: 0, y: 0, width: outW, height: outH };
  const outPaint = Skia.Paint();
  outPaint.setAntiAlias(true);
  outCanvas.drawImageRect(image, cropSrc, cropDst, outPaint);

  const outSnap = outSurface.makeImageSnapshot();
  return {
    base64:
      outSnap?.encodeToBase64(ImageFormat.PNG, 85) ?? image.encodeToBase64(ImageFormat.PNG, 85),
    width: outW,
    height: outH,
  };
};
