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

const MAGIC_TOUCH_MODEL_INPUT_SIZE = 512;

export const segmentStaticImage = async (
  skImage: SkImage,
  coordinate: { x: number; y: number }
) => {
  const { magicTouchModel } = await allModel.get();

  try {
    const input = preprocessMagicTouchInput(skImage, {
      x: coordinate.x,
      y: coordinate.y,
    }); // Float32Array length 512*512*4
    const startTime = performance.now();

    const magicTouchOutputs = magicTouchModel.runSync([
      input,
    ]) as Float32Array[];

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`segmentStaticImage took ${duration} milliseconds`);

    let returnSkImage: SkImage = skImage;

    if (magicTouchOutputs[0]) {
      const magicMaskOutputs = applyMagicTouchMaskAndExport(
        skImage,
        magicTouchOutputs[0]
      );

      if (magicMaskOutputs?.finalImage) {
        returnSkImage = magicMaskOutputs?.finalImage;
      }
    }

    const base64 = returnSkImage.encodeToBase64(ImageFormat.PNG, 85);
    const url = `data:image/png;base64,${base64}`;
    // console.log("Segmented image URL:", url);

    // Fetch dominant colors for background placeholder
    const backgroundColor = await fetchColors(url);

    return {
      background_color: backgroundColor,
      skImage: returnSkImage,
    };
  } catch (error) {
    console.error("Error processing static image:", error);
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
    console.warn("Error fetching image colors, using fallback:", error);
    return "#f4f4f5";
  }
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

const convertFloat32ArrayToUint8Array = (float32Array: Float32Array) => {
  "worklet";
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
