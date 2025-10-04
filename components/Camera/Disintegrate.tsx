// import React, { useCallback } from "react";
// import { Pressable, StyleSheet } from "react-native";
// import {
//   Canvas,
//   Group,
//   ImageShader,
//   Rect,
//   DisplacementMap,
//   Turbulence,
//   useImage,
//   Image,
// } from "@shopify/react-native-skia";
// import Animated, {
//   useSharedValue,
//   withTiming,
//   withSequence,
//   runOnJS,
// } from "react-native-reanimated";

// const DURATION = 600;
// const MAX_DISPLACEMENT = 300;
// const OPACITY_CHANGE_START = 0.5;

// export function DisintegrateButton({ source }: { source: any }) {
//   // Load image (you can use react-native-view-shot to capture any View as image)
//   const image = useImage(require("~/assets/images/placeholder.png"));

//   const scale = useSharedValue(1);
//   const opacity = useSharedValue(1);
//   const displacement = useSharedValue(0);

//   const reset = useCallback(() => {
//     scale.value = 1;
//     opacity.value = 1;
//     displacement.value = 0;
//   }, [scale, opacity, displacement]);

//   const handlePress = () => {
//     scale.value = withSequence(
//       withTiming(1.2, { duration: DURATION * OPACITY_CHANGE_START }),
//       withTiming(1, { duration: 0 })
//     );

//     opacity.value = withSequence(
//       withTiming(1, { duration: DURATION * OPACITY_CHANGE_START }),
//       withTiming(0, { duration: DURATION * (1 - OPACITY_CHANGE_START) }, () =>
//         runOnJS(reset)()
//       )
//     );

//     displacement.value = withTiming(MAX_DISPLACEMENT, { duration: DURATION });
//   };

//   //   if (!image) return null;

//   return (
//     <Pressable onPress={handlePress} className="w-32 h-32">
//       <Canvas style={styles.canvas}>
//         <Group transform={[{ scale: scale.value }]} opacity={opacity.value}>
//           <DisplacementMap scale={displacement} channelX="r" channelY="g">
//             <Turbulence freqX={0.015} freqY={0.015} octaves={2} />
//             <Image
//               image={image}
//               fit="contain"
//               x={0}
//               y={0}
//               width={256}
//               height={256}
//             />
//             {/* <ImageShader
//               image={image}
//               x={0}
//               y={0}
//               width={120}
//               height={120}
//               fit="contain"
//             /> */}
//           </DisplacementMap>
//         </Group>
//       </Canvas>
//     </Pressable>
//   );
// }

// const styles = StyleSheet.create({
//   canvas: {
//     width: 300,
//     height: 300,
//   },
// });
