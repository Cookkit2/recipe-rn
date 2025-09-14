// import React, { useState, useEffect, useRef, useMemo, createRef } from "react";
// import {
//   InteractionManager,
//   StyleSheet,
//   View,
//   type LayoutRectangle,
//   type StyleProp,
//   type ViewStyle,
// } from "react-native";
// // import ViewShot from "react-native-view-shot";
// import Canvas, { Image as CanvasImage, ImageData } from "react-native-canvas";
// import {
//   createBlankImageData,
//   generateBlankCanvas,
//   weightedRandomDistrib,
// } from "./Utils";
// import FileHelper from "./FileHelper";
// import AppHelper from "./AppHelper";
// import Animated, {
//   FadeOut,
//   useAnimatedStyle,
//   withDelay,
//   withTiming,
// } from "react-native-reanimated";
// import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

// export type UIState = "visible" | "hidden";

// const DEFAULT_CANVAS_COUNT = 4;

// export type InfinityGauntletProps = {
//   imageUrl: string;
//   imageSize: {
//     width: number;
//     height: number;
//   };
//   children?: React.ReactNode;
//   /**
//    * (optional), default: `32`
//    * Number of canvas use for dust animation, the more canvas the more smooth look on the animation, but also more lagging and slower initial
//    */
//   canvasCount?: number;
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
//   onAnimationPrepare?: () => any;
//   /**
//    * (optional)
//    * Trigger when dust animation is ready to use
//    */
//   onAnimationReady?: () => any;
//   /**
//    * (optional)
//    * Trigger when there is an error in the component functions
//    */
//   onError?: (error?: any) => any;
//   /**
//    * (optional)
//    * Trigger when snap animation is completed
//    */
//   onAnimationCompleted?: (state?: UIState) => any;
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

// const GauntletImage2: React.FC<InfinityGauntletProps> = ({
//   imageUrl,
//   imageSize,
//   children,
//   canvasCount = DEFAULT_CANVAS_COUNT,
//   zIndex = 2,
//   snap = false,
//   disablePrepareOnReload,
//   onAnimationPrepare,
//   onAnimationReady,
//   onError,
//   style,
//   originalElementStyle,
// }) => {
//   //   console.log("imported imageUrl --,>", imageUrl);
//   //States
//   //   const [imgUrl, setImgUrl] = useState("");
//   //   const [snapLayout, setSnapLayout] = useState<LayoutRectangle>();
//   const imgUrl = imageUrl;
//   const snapLayout = imageSize;
//   const [compressedImage, setCompressedImage] = useState("");
//   const [imgBase64, setImgBase64] = useState("");
//   const [state, setState] = useState<UIState>("visible");
//   const [drawComplete, setDrawComplete] = useState(false); //Draw view sanpshot to canvas
//   const [animationReady, setAnimationReady] = useState(false);
//   const [error, setError] = useState<any>("");

//   //Refs
// //   const viewshotRef = useRef<ViewShot>(null);
//   const imgUrlRef = useRef(imgUrl);
//   const canvasRef = useRef<Canvas>(null);
//   const particleRefs = useRef(
//     Array.from({ length: canvasCount }, (_) => createRef<Canvas>())
//   );
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
//     return generateBlankCanvas(
//       particleRefs.current,
//       state,
//       canvasCount,
//       zIndex
//     );
//   }, [state, canvasCount, zIndex]);

//   //Effects
//   //   useEffect(() => {
//   //     if (!disablePrepareOnReload || !imgUrlRef.current) {
//   //       //FIXME: to prevent it reload multiple times
//   //       InteractionManager.runAfterInteractions(() => {
//   //         setTimeout(() => {
//   //           viewshotRef.current
//   //             ?.capture?.()
//   //             ?.then((url) => {
//   //               console.log("capture img --,>", url);
//   //               setImgUrl(url);
//   //               imgUrlRef.current = url;
//   //             })
//   //             ?.catch((e) => {
//   //               // console.log('capture err --,>', e);
//   //               setError(e);
//   //             });
//   //         }, 300);
//   //       });
//   //     }
//   //     // eslint-disable-next-line react-hooks/exhaustive-deps
//   //   }, []);

//   useEffect(() => {
//     loadSnapshot();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [imgUrl, snapLayout]);
//   useEffect(() => {
//     if (!!canvasRef.current && drawComplete) {
//       setError("");
//       handleSnap(canvasRef.current, snap, imgBase64);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [drawComplete, imgBase64, snap]);
//   useEffect(() => {
//     if (animationReady) {
//       onAnimationReady?.();
//     } else {
//       onAnimationPrepare?.();
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [animationReady]);
//   useEffect(() => {
//     if (!error && (error + "")?.length) {
//       onError?.(error);
//     }
//   }, [error, onError]);

//   const handleCanvas = (canvas: Canvas) => {
//     if (!canvas) {
//       return;
//     }
//     canvasRef.current = canvas;
//   };

//   const loadSnapshot = async () => {
//     setError("");
//     if (canvasRef.current && imgUrl && snapLayout?.width) {
//       canvasRef.current.width = snapLayout?.width;
//       canvasRef.current.height = snapLayout?.height;

//       const image = new CanvasImage(canvasRef.current);
//       // image.crossOrigin = 'Anonymous';
//       image.src = await FileHelper.base64File(imgUrl);
//       setImgBase64(image.src);

//       const context = canvasRef.current?.getContext("2d");

//       image.addEventListener("error", (props) => {
//         console.log("image load error --,>", props);
//         setError(props);
//       });

//       image.addEventListener("load", async (_props) => {
//         console.log("image.src loaded");
//         context.drawImage(image, 0, 0, snapLayout?.width, snapLayout?.height);
//         setTimeout(() => {
//           setError("");
//           setDrawComplete(true);
//         }, 20);
//       });

//       const compressedImage = await manipulateAsync(
//         imgUrl,
//         [
//           {
//             resize: {
//               width: snapLayout?.width,
//               height: snapLayout?.height,
//             },
//           },
//         ],
//         {
//           compress: 0.1,
//           format: SaveFormat.PNG,
//         }
//       );
//       setCompressedImage(compressedImage.uri);
//     }
//   };

//   async function handleSnap(
//     canvas: Canvas,
//     lSnap: boolean,
//     lImgBase64: string
//   ) {
//     try {
//       if (!imageDataArrayRef.current?.length) {
//         setAnimationReady(false);
//         const w = Math.floor(canvas.width) * 3;
//         const h = Math.floor(canvas.height) * 3;

//         const compressedImageBase64 =
//           await FileHelper.base64File(compressedImage);

//         console.log("pixelArrLength --,>", h * w * 4);
//         // const pixelArr = await FileHelper.base64PNGToByteArray(
//         //   compressedImageBase64
//         // );
//         const pixelArr = await FileHelper.getCanvasImageData(canvas);
//         const pixelArrLength = pixelArr.length; // pixelArr?.length;
//         console.log("pixelArr --,>", pixelArr.length);

//         imageDataArrayRef.current = createBlankImageData(
//           pixelArrLength,
//           canvasCount
//         );
//         // console.log('len --,>', pixelArr?.length, pixelArrLength);

//         for (let i = 0; i < pixelArrLength; i += 4) {
//           //Find the highest probability canvas the pixel should be in
//           const p = Math.floor((i / pixelArrLength) * canvasCount);
//           const rand = weightedRandomDistrib(p, canvasCount);
//           const a = imageDataArrayRef.current[rand ?? 0];
//           if (a) {
//             a[i] = pixelArr[i] ?? 0;
//             a[i + 1] = pixelArr[i + 1] ?? 0;
//             a[i + 2] = pixelArr[i + 2] ?? 0;
//             a[i + 3] = pixelArr[i + 3] ?? 0;
//           }
//         }

//         await Promise.all([
//           ...particleRefs.current.map(async (ref, idx) => {
//             if (ref.current) {
//               ref.current.width = w / 3;
//               ref.current.height = h / 3;
//               const ctx2 = ref.current.getContext("2d");
//               try {
//                 ctx2.putImageData(
//                   new ImageData(
//                     ref.current,
//                     imageDataArrayRef.current[idx] as any,
//                     w,
//                     h
//                   ),
//                   0,
//                   0
//                 );
//               } catch (e) {
//                 console.error("inside error --,>", e);
//                 throw e;
//               }
//             }
//             // await AppHelper.delay(1);
//           }),
//         ]);
//         setAnimationReady(true);
//       } else {
//         setAnimationReady(true);
//       }
//       if (!lSnap || !canvasRef.current) {
//         setState("visible");
//       } else {
//         setState("hidden");
//       }
//     } catch (e) {
//       console.log("handleSnap error --,>", e);
//       setError(e);
//     }
//   }

//   return (
//     <View
//       style={[
//         styles.container,
//         {
//           width: snapLayout?.width ?? "auto",
//           height: snapLayout?.height ?? "auto",
//         },
//         style,
//       ]}
//     >
//       <Animated.View
//         exiting={FadeOut}
//         className="absolute"
//         style={[{ zIndex }, originalElementStyle, containerAnimatedStyle]}
//       >
//         <Canvas
//           ref={handleCanvas}
//           originWhitelist={["*"]}
//           style={[
//             {
//               width: snapLayout?.width ?? "auto",
//             },
//           ]}
//         />
//         {/* <ViewShot
//           ref={viewshotRef}
//           options={{
//             fileName: "InfinityGauntlet-snapshot",
//             format: "png",
//             quality: 1,
//           }}
//           style={styles.snapshot}
//           onLayout={(l) => {
//             setSnapLayout(l?.nativeEvent?.layout);
//           }}
//         >
//           {children}
//         </ViewShot> */}
//       </Animated.View>
//       {canvases}
//     </View>
//   );
// };

// export default GauntletImage2;

// const styles = StyleSheet.create({
//   container: {
//     // flex: 1,
//   },

//   snapshot: {
//     position: "absolute",
//   },
// });
