// import React, { useState, useEffect, useRef, useMemo } from "react";
// import { View, type StyleProp, type ViewStyle } from "react-native";
// import { createBlankImageData, DustCanvas, weightedRandomDistrib } from "./Utils";
// // import FileHelper from "./FileHelper";
// import Animated, {
//   useAnimatedStyle,
//   withDelay,
//   withTiming,
// } from "react-native-reanimated";
// import {
//   Canvas,
//   Image as SkiaImage,
//   useImage,
//   Skia,
// } from "@shopify/react-native-skia";
// import { toast } from "sonner-native";

// export type UIState = "visible" | "hidden";

// const DEFAULT_CANVAS_COUNT = 12;

// export type InfinityGauntletProps = {
//   imageUrl: string | number;
//   imageSize: {
//     width: number;
//     height: number;
//   };
//   /**
//    * (optional), default: `2`
//    * Index of the component in UI stack, use this if you want to bring your UI to front
//    */
//   zIndex?: number;
//   /**
//    * (optional)
//    * Set the snap animation state
//    */
//   snap?: boolean;
//   /**
//    * (optional)
//    * Flag to reduce re-init the animation canvas when you update the main component
//    */
//   disablePrepareOnReload?: boolean;
//   /**
//    * (optional)
//    * Trigger when dust animation initialization start
//    */
//   onAnimationPrepare?: () => void;
//   /**
//    * (optional)
//    * Trigger when dust animation is ready to use
//    */
//   onAnimationReady?: () => void;
//   /**
//    * (optional)
//    * Trigger when there is an error in the component functions
//    */
//   onError?: (error?: unknown) => void;
//   /**
//    * (optional)
//    * Trigger when snap animation is completed
//    */
//   onAnimationCompleted?: (state?: UIState) => void;
//   /**
//    * (optional)
//    * Style of the Wrapper
//    */
//   style?: StyleProp<ViewStyle>;
//   /**
//    * (optional)
//    * Style of the Main UI component
//    */
//   originalElementStyle?: StyleProp<ViewStyle>;
//   /**
//    * (optional)
//    * Style of the dust canvas list
//    */
//   canvasContainerStyle?: StyleProp<ViewStyle>;
// };

// const GauntletImage: React.FC<InfinityGauntletProps> = ({
//   imageUrl: imgUrl,
//   imageSize,
//   zIndex = 2,
//   snap = false,
//   disablePrepareOnReload: _disablePrepareOnReload,
//   onAnimationPrepare: _onAnimationPrepare,
//   onAnimationReady: _onAnimationReady,
//   onError: _onError,
//   style,
//   originalElementStyle,
// }) => {
//   //States
//   const [state, setState] = useState<UIState>("visible");
//   const [layerImages, setLayerImages] = useState<
//     Array<ReturnType<typeof Skia.Image.MakeImageFromEncoded> | null>
//   >([]);

//   const image = useImage(require("~/assets/images/placeholder.png"));

//   const imageDataArrayRef = useRef<number[][]>([]);

//   // AnimatedValues
//   const containerAnimatedStyle = useAnimatedStyle(() => {
//     return {
//       opacity: withDelay(
//         state === "visible" ? 2320 : 0,
//         withTiming(state === "visible" ? 1 : 0, {
//           duration: state === "visible" ? 1000 : 1500,
//         })
//       ),
//     };
//   });

//   const canvases = useMemo(() => {
//     return Array.from({ length: DEFAULT_CANVAS_COUNT }, (_, i) => (
//       <DustCanvas key={i} state={state} index={i} zIndex={zIndex}>
//         <Canvas style={{ width: imageSize.width, height: imageSize.height }}>
//           {layerImages[i] ? (
//             <SkiaImage
//               image={layerImages[i]!}
//               x={0}
//               y={0}
//               width={imageSize.width}
//               height={imageSize.height}
//               fit="contain"
//             />
//           ) : null}
//         </Canvas>
//       </DustCanvas>
//     ));
//   }, [state, zIndex, imageSize.height, imageSize.width, layerImages]);

//   useEffect(() => {
//     const initFromImageUrl = async () => {
//       try {
//         const {
//           data: pixelArr,
//           width,
//           height,
//         } = await FileHelper.imageUrlToRGBA(imgUrl);

//         const pixelArrLength = pixelArr.length;

//         imageDataArrayRef.current = createBlankImageData(
//           pixelArrLength,
//           DEFAULT_CANVAS_COUNT
//         );

//         for (let i = 0; i < pixelArrLength; i += 4) {
//           const p = Math.floor((i / pixelArrLength) * DEFAULT_CANVAS_COUNT);
//           const rand = weightedRandomDistrib(p, DEFAULT_CANVAS_COUNT);
//           const a = imageDataArrayRef.current[rand ?? 0];
//           if (a) {
//             a[i] = pixelArr[i] ?? 0;
//             a[i + 1] = pixelArr[i + 1] ?? 0;
//             a[i + 2] = pixelArr[i + 2] ?? 0;
//             a[i + 3] = pixelArr[i + 3] ?? 0;
//           }
//         }

//         const images: Array<ReturnType<
//           typeof Skia.Image.MakeImageFromEncoded
//         > | null> = await Promise.all(
//           imageDataArrayRef.current.map(async (arr) => {
//             try {
//               const b64 = FileHelper.rgbaToPNGBase64(width, height, arr);
//               const img = Skia.Image.MakeImageFromEncoded(
//                 Skia.Data.fromBase64(b64)
//               );
//               return img ?? null;
//             } catch {
//               return null;
//             }
//           })
//         );
//         setLayerImages(images);
//       } catch (e) {
//         toast.error("Error loading image");
//         console.error(e);
//       }
//     };

//     initFromImageUrl();
//   }, [imgUrl]);

//   useEffect(() => {
//     setState(snap ? "hidden" : "visible");
//   }, [snap]);

//   return (
//     <View
//       style={[
//         {
//           width: imageSize.width ?? "auto",
//           height: imageSize.height ?? "auto",
//         },
//         style,
//       ]}
//     >
//       <Animated.View
//         className="absolute"
//         style={[{ zIndex }, originalElementStyle, containerAnimatedStyle]}
//       >
//         <Canvas style={{ width: imageSize.width, height: imageSize.height }}>
//           {image ? (
//             <SkiaImage
//               image={image}
//               fit="contain"
//               x={0}
//               y={0}
//               width={imageSize.width}
//               height={imageSize.height}
//             />
//           ) : null}
//         </Canvas>
//       </Animated.View>

//       {canvases}
//     </View>
//   );
// };

// export default GauntletImage;
