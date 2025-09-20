// import React from "react";
// import Canvas from "react-native-canvas";
// import type { UIState } from "./Graunlet";
// import posed from "react-native-pose";
// import Animated, {
//   useAnimatedStyle,
//   withDelay,
//   withTiming,
// } from "react-native-reanimated";
// import type { StyleProp, ViewStyle } from "react-native";

// export function weightedRandomDistrib(peak: number, canvasCount: number) {
//   const prob: number[] = [];
//   const seq: number[] = [];
//   for (let i = 0; i < canvasCount; i++) {
//     prob.push(Math.pow(canvasCount - Math.abs(peak - i), 3));
//     seq.push(i);
//   }
//   const total = prob.reduce((a, b) => a + b, 0);
//   let r = Math.random() * total;
//   for (let i = 0; i < seq.length; i++) {
//     r -= prob[i] ?? 0;
//     if (r <= 0) return seq[i];
//   }
//   return seq[seq.length - 1];
// }

// export function createBlankImageData(length: number, canvasCount: number) {
//   const imageDataArray: number[][] = Array.from({ length: canvasCount }, (_) =>
//     Array.from({ length }, (__) => 0)
//   );
//   return imageDataArray;
// }

// // const DustCanvas = posed.View({
// //   visible: {
// //     opacity: 1,
// //     transition: { duration: 600 },
// //     // filter: 'blur(0)',
// //     y: 0,
// //     x: 0,
// //     rotate: "0deg",
// //   },
// //   hidden: {
// //     opacity: 0,
// //     // Randomise from -56 to 56
// //     y: Math.floor(Math.random() * (56 - -56 + 1)) + -56,
// //     x: Math.floor(Math.random() * (56 - -56 + 1)) + -56,
// //     rotate: Math.floor(Math.random() * (20 - -20 + 1)) + -20 + "deg",
// //     transition: { duration: 600 },
// //     // filter: 'blur(2px)',
// //   },
// // });

// // export function generateBlankCanvas(
// //   refs: React.RefObject<Canvas | null>[],
// //   state: UIState,
// //   canvasCount: number,
// //   zIndex: number
// // ) {
// //   return Array.from({ length: canvasCount }, (_, i) => (
// //     <DustCanvas
// //       key={i}
// //       style={{
// //         position: "absolute",
// //         zIndex: zIndex - 1,
// //       }}
// //       pose={state}
// //     >
// //       <Canvas ref={refs[i]!} />
// //     </DustCanvas>
// //   ));
// // }

// interface DustCanvasProps {
//   state: UIState;
//   index: number; // for stagger delay
//   children: React.ReactNode;
//   zIndex: number;
// }

// export const DustCanvas: React.FC<DustCanvasProps> = ({
//   state,
//   index,
//   children,
//   zIndex,
// }) => {
//   // Deviate from 32 to 56
//   const randX = React.useMemo(
//     () => Math.floor(Math.random() * (56 - 32 + 1)) + 32,
//     []
//   );
//   const randY = React.useMemo(
//     () => -Math.floor(Math.random() * (56 - 32 + 1)) + 32,
//     []
//   );
//   const randRotate = React.useMemo(
//     () => Math.floor(Math.random() * (20 - -20 + 1)) + -20,
//     []
//   );

//   const delay = 200 + index * 35; // base + stagger

//   const animatedStyle = useAnimatedStyle(() => {
//     if (state === "visible") {
//       return {
//         opacity: withDelay(delay, withTiming(1, { duration: 600 })),
//         transform: [
//           { translateX: withDelay(delay, withTiming(0, { duration: 600 })) },
//           { translateY: withDelay(delay, withTiming(0, { duration: 600 })) },
//           { rotate: withDelay(delay, withTiming("0deg", { duration: 600 })) },
//         ],
//       };
//     } else {
//       return {
//         opacity: withDelay(delay, withTiming(0, { duration: 600 })),
//         transform: [
//           {
//             translateX: withDelay(delay, withTiming(randX, { duration: 600 })),
//           },
//           {
//             translateY: withDelay(delay, withTiming(randY, { duration: 600 })),
//           },
//           {
//             rotate: withDelay(
//               delay,
//               withTiming(`${randRotate}deg`, { duration: 600 })
//             ),
//           },
//         ],
//       };
//     }
//   }, [state]);

//   return (
//     <Animated.View
//       style={[{ position: "absolute", zIndex: zIndex - 1 }, animatedStyle]}
//     >
//       {children}
//     </Animated.View>
//   );
// };

// export function generateBlankCanvas(
//   refs: React.RefObject<any>[],
//   state: UIState,
//   canvasCount: number,
//   zIndex: number
// ) {
//   return Array.from({ length: canvasCount }, (_, i) => (
//     <DustCanvas key={i} state={state} index={i} zIndex={zIndex}>
//       <Canvas ref={refs[i]!} />
//     </DustCanvas>
//   ));
// }
