// import { useState, useEffect, useCallback } from "react";
// import { DeviceMotion } from "expo-sensors";

// export interface TiltAngles {
//   roll: number; // Left/Right tilt (-180 to 180)
//   pitch: number; // Forward/Backward tilt (-90 to 90)
//   yaw: number; // Compass heading (0 to 360)
// }

// export function useDeviceMotion() {
//   const [tiltAngles, setTiltAngles] = useState<TiltAngles>({
//     roll: 0,
//     pitch: 0,
//     yaw: 0,
//   });
//   const [isAvailable, setIsAvailable] = useState<boolean>(false);
//   const [isSubscribed, setIsSubscribed] = useState<boolean>(false);

//   const subscribeToDeviceMotion = useCallback(async () => {
//     try {
//       const available = await DeviceMotion.isAvailableAsync();
//       setIsAvailable(available);

//       if (available) {
//         DeviceMotion.addListener((motionData) => {
//           if (motionData.rotation) {
//             // DeviceMotion provides rotation data in radians, convert to degrees
//             const roll = (motionData.rotation.gamma || 0) * (180 / Math.PI);
//             const pitch = (motionData.rotation.beta || 0) * (180 / Math.PI);
//             const yaw = (motionData.rotation.alpha || 0) * (180 / Math.PI);

//             setTiltAngles({ roll, pitch, yaw });
//           }
//         });
//         setIsSubscribed(true);
//       }
//     } catch (error) {
//       // eslint-disable-next-line no-console
//       console.error("Failed to subscribe to DeviceMotion:", error);
//       // DeviceMotion failed to start
//       setIsSubscribed(false);
//     }
//   }, []);

//   const unsubscribeFromDeviceMotion = useCallback(() => {
//     DeviceMotion.removeAllListeners();
//     setIsSubscribed(false);
//   }, []);

//   useEffect(() => {
//     subscribeToDeviceMotion();

//     return () => {
//       unsubscribeFromDeviceMotion();
//     };
//   }, [subscribeToDeviceMotion, unsubscribeFromDeviceMotion]);

//   return {
//     tiltAngles,
//     isAvailable,
//     isSubscribed,
//   };
// }
