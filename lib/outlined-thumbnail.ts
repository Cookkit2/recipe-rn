import { File, Paths } from "expo-file-system";
import { Image } from "expo-image";
import { PixelRatio } from "react-native";
import { contentFingerprint } from "~/utils/content-fingerprint";
import { AsyncWorkQueue } from "~/utils/async-work-queue";

const jobs = new AsyncWorkQueue(1);
const pending = new Map<string, Promise<string | undefined>>();

/** Bake the existing eight-offset outline once, using local/native-cached bytes. */
export function outlinedThumbnail(
  uri: string,
  size: number,
  color: string,
  stroke: number,
  nativeCacheKey = uri
): Promise<string | undefined> {
  const density = PixelRatio.get();
  const pixels = size * density;
  const key = contentFingerprint([uri, size, color, stroke, nativeCacheKey, density]);
  const existing = pending.get(key);
  if (existing) return existing;
  const operation = jobs
    .run(async () => {
      const file = new File(Paths.cache, `outlined-v1-${key}.png`);
      if (file.exists) return file.uri;
      const path =
        uri.startsWith("file://") || uri.startsWith("data:")
          ? uri
          : await Image.getCachePathAsync(nativeCacheKey);
      if (!path) return undefined;
      const { Skia, BlendMode, ImageFormat } = await import("@shopify/react-native-skia");
      const image = Skia.Image.MakeImageFromEncoded(
        await Skia.Data.fromURI(/^[a-z][a-z0-9+.-]*:/i.test(path) ? path : `file://${path}`)
      );
      if (!image) return undefined;
      try {
        const radius = Math.max(1, Math.round(stroke)) * density;
        const extent = Math.ceil(pixels + radius * 2);
        const surface = Skia.Surface.MakeOffscreen(extent, extent);
        if (!surface) return undefined;
        try {
          const canvas = surface.getCanvas();
          canvas.clear(Skia.Color("transparent"));
          const scale = Math.min(pixels / image.width(), pixels / image.height());
          const width = image.width() * scale,
            height = image.height() * scale;
          const x = radius + (pixels - width) / 2,
            y = radius + (pixels - height) / 2;
          const src = { x: 0, y: 0, width: image.width(), height: image.height() };
          const paint = Skia.Paint();
          paint.setAntiAlias(true);
          paint.setColorFilter(Skia.ColorFilter.MakeBlend(Skia.Color(color), BlendMode.SrcIn));
          for (const [dx, dy] of [
            [-radius, 0],
            [radius, 0],
            [0, -radius],
            [0, radius],
            [-radius, -radius],
            [-radius, radius],
            [radius, -radius],
            [radius, radius],
          ]) {
            canvas.drawImageRect(image, src, { x: x + dx!, y: y + dy!, width, height }, paint);
          }
          const original = Skia.Paint();
          original.setAntiAlias(true);
          canvas.drawImageRect(image, src, { x, y, width, height }, original);
          const snapshot = surface.makeImageSnapshot();
          try {
            file.write(snapshot.encodeToBase64(ImageFormat.PNG, 100), { encoding: "base64" });
            return file.uri;
          } finally {
            snapshot.dispose();
          }
        } finally {
          surface.dispose();
        }
      } finally {
        image.dispose();
      }
    }, new AbortController().signal)
    .then((result) => result);
  pending.set(key, operation);
  void operation.finally(() => pending.delete(key)).catch(() => {});
  return operation;
}
