// import Canvas, { ImageData } from "react-native-canvas";
// // import { PNG } from "pngjs";
// import { Asset } from "expo-asset";
// import * as FileSystem from "expo-file-system";
// import jpeg from "jpeg-js";

// const MAX_EXTEND = 221;
// const MAX_EXTEND_SQUARE = MAX_EXTEND * MAX_EXTEND;

// export default class FileHelper {
//   static base64File = async (url: string) => {
//     const data = await fetch(url);
//     const blob = await data.blob();
//     return new Promise<string>((resolve) => {
//       const reader = new FileReader();
//       reader.readAsDataURL(blob);
//       reader.onloadend = () => {
//         const base64data =
//           typeof reader.result === "string"
//             ? reader.result
//             : Buffer.from(reader.result as ArrayBuffer).toString(); //reader.result;
//         resolve(base64data);
//       };
//     });
//   };

//   /**
//    * Use canvas context to fetch image data, really slow
//    * @param canvas {Canvas}
//    * @returns {number[]} the array of pixel rgba [r0, g0, b0, a0, r1, g1, b1, a1, ...]
//    */
//   static getCanvasImageData = async (canvas: Canvas) => {
//     const w = Math.floor(canvas.width) * 3;
//     const h = Math.floor(canvas.height) * 3;
//     const ctx = canvas.getContext("2d");
//     const data: number[] = Array.from({ length: 4 * w * h }, (_) => 0);

//     let x = 0,
//       y = 0,
//       count = 0;
//     const promiseMap = new Map<number, Promise<ImageData>>();
//     while (/*x < w ||*/ y <= h) {
//       const currW = MAX_EXTEND_SQUARE > w ? w : MAX_EXTEND_SQUARE;
//       const currH = Math.floor(
//         MAX_EXTEND_SQUARE / currW + y > h ? h : MAX_EXTEND_SQUARE / currW
//       );

//       // const dt = await ctx.getImageData(x, y, currW, currH);
//       // const vals = Object.values(dt.data);
//       // vals?.forEach((it, idx) => {
//       //   data[idx + count] = it;
//       // });
//       promiseMap.set(count, ctx.getImageData(x, y, currW, currH));

//       x = currW < w ? x + currW : 0;
//       y = currW < w ? currH : y + currH;
//       count += currW * currH * 4;
//     }
//     await Promise.all(
//       Array.from(promiseMap.keys()).map(async (prmK) => {
//         const dt = await promiseMap.get(prmK);
//         const vals = Object.values(dt?.data ?? {});
//         vals?.forEach((it, idx) => {
//           data[idx + prmK] = it;
//         });
//       })
//     );

//     // return new ImageData(canvas, data, w, h);
//     return data;
//   };

//   /**
//    * Use base64 image to fetch image pixel data (RGBA)
//    * @param imgBase64 {string} base64 string of snapshot (png or jpeg)
//    * @returns {number[]} array of pixel rgba values [r0,g0,b0,a0, r1,g1,b1,a1, ...]
//    */
//   static base64ImageToRGBA = async (imgBase64: string): Promise<number[]> => {
//     // detect MIME type
//     const match = imgBase64.match(/^data:(image\/\w+);base64,/);
//     if (!match) throw new Error("Invalid base64 image string");

//     const mimeType = match[1];
//     const cleanedBase64 = imgBase64.replace(/^data:image\/\w+;base64,/, "");
//     const buffer = Buffer.from(cleanedBase64, "base64");

//     if (mimeType === "image/png") {
//       // decode PNG
//       const png = PNG.sync.read(buffer);
//       return Array.from(png.data); // already RGBA
//     }

//     if (mimeType === "image/jpeg") {
//       // decode JPEG
//       console.log("decoding jpeg");
//       const decoded = jpeg.decode(buffer, { useTArray: true });
//       console.log("decoding jpeg done");
//       return Array.from(decoded.data); // converted to RGBA
//     }

//     throw new Error(`Unsupported image type: ${mimeType}`);
//   };

//   /**
//    * Use base64 image to fetch image data, fast
//    * @param imgBase64 {string} base64 string of view snapshot
//    * @returns {number[]} the array of pixel rgba [r0, g0, b0, a0, r1, g1, b1, a1, ...]
//    */
//   static base64PNGToByteArray = async (imgBase64: string) => {
//     const parts = imgBase64.split(";");
//     // let mimeType = parts[0].split(':')[1];
//     const imageData = parts[1]?.split(",")[1] ?? "";

//     const png = PNG.sync.read(Buffer.from(imageData, "base64"));
//     const data = Uint8ClampedArray.from(png.data);

//     const finalData: number[] = Object.values(data);
//     // await AppHelper.delay(1);
//     return finalData;
//   };

//   /**
//    * Decode a base64 PNG (data URL or raw base64) into raw RGBA bytes with dimensions
//    */
//   static decodeBase64PNG = async (
//     imgBase64: string
//   ): Promise<{ data: number[]; width: number; height: number }> => {
//     const parts = imgBase64.includes(",")
//       ? imgBase64.split(",")
//       : ["", imgBase64];
//     const raw = parts[1] ?? imgBase64;
//     const png = PNG.sync.read(Buffer.from(raw, "base64"));
//     const data = Uint8ClampedArray.from(png.data);
//     const finalData: number[] = Object.values(data);
//     // await AppHelper.delay(1);
//     return { data: finalData, width: png.width, height: png.height };
//   };

//   /**
//    * Encode an RGBA byte array into a PNG base64 string (no data URL prefix)
//    */
//   static rgbaToPNGBase64 = (
//     width: number,
//     height: number,
//     rgbaData: number[]
//   ): string => {
//     const png = new PNG({ width, height });
//     const clamped = Uint8ClampedArray.from(rgbaData);
//     // Copy RGBA into png.data buffer
//     for (let i = 0; i < clamped.length; i++) {
//       // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
//       (png.data as unknown as Uint8Array)[i] = clamped[i]!;
//     }
//     const encoded = PNG.sync.write(png);
//     return Buffer.from(encoded).toString("base64");
//   };

//   /**
//    * Convert an image URL (http(s), file://, data URI, or Expo asset) directly to raw RGBA bytes
//    */
//   static imageUrlToRGBA = async (
//     url: string | number
//   ): Promise<{ data: number[]; width: number; height: number }> => {
//     // Data URL
//     if (typeof url === "string" && url.startsWith("data:")) {
//       return this.decodeBase64PNG(url);
//     }

//     // Local filesystem
//     if (
//       typeof url === "string" &&
//       (url.startsWith("file://") || url.startsWith("/"))
//     ) {
//       const base64 = await FileSystem.readAsStringAsync(url, {
//         encoding: "base64",
//       });
//       return this.decodeBase64PNG(base64);
//     }

//     // Module asset (require(...))
//     if (typeof url === "number") {
//       const asset = Asset.fromModule(url);
//       await asset.downloadAsync();
//       const fileUri = asset.localUri ?? asset.uri;
//       if (fileUri) {
//         const base64 = await FileSystem.readAsStringAsync(fileUri, {
//           encoding: "base64",
//         });
//         return this.decodeBase64PNG(base64);
//       }
//     }

//     // Try to resolve via Expo Asset (covers packager and remote URIs)
//     try {
//       const asset = Asset.fromURI(typeof url === "string" ? url : "");
//       await asset.downloadAsync();
//       const fileUri = asset.localUri ?? asset.uri;
//       if (fileUri) {
//         const base64 = await FileSystem.readAsStringAsync(fileUri, {
//           encoding: "base64",
//         });
//         return this.decodeBase64PNG(base64);
//       }
//     } catch (_e) {
//       // fallthrough to fetch
//     }

//     // Remote fetch fallback
//     const remoteUrl = typeof url === "string" ? url : "";
//     const res = await fetch(remoteUrl);
//     const buffer = Buffer.from(await res.arrayBuffer());
//     const png = PNG.sync.read(buffer);
//     const data = Uint8ClampedArray.from(png.data);
//     return { data: Array.from(data), width: png.width, height: png.height };
//   };
// }
