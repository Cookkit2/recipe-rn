import { Easing, ReduceMotion } from "react-native-reanimated";

export const CURVES = {
  "expressive.fast.spatial": {
    duration: 350,
    easing: Easing.bezier(0.42, 1.67, 0.21, 0.9),
    reduceMotion: ReduceMotion.System,
  },
  "expressive.default.spatial": {
    duration: 500,
    easing: Easing.bezier(0.38, 1.21, 0.22, 1.0),
    reduceMotion: ReduceMotion.System,
  },
  "expressive.slow.spatial": {
    duration: 650,
    easing: Easing.bezier(0.39, 1.29, 0.35, 0.98),
    reduceMotion: ReduceMotion.System,
  },
  "expressive.fast.effects": {
    duration: 150,
    easing: Easing.bezier(0.31, 0.94, 0.34, 1.0),
    reduceMotion: ReduceMotion.System,
  },
  "expressive.default.effects": {
    duration: 200,
    easing: Easing.bezier(0.34, 0.8, 0.34, 1.0),
    reduceMotion: ReduceMotion.System,
  },
  "expressive.slow.effects": {
    duration: 300,
    easing: Easing.bezier(0.34, 0.88, 0.34, 1.0),
    reduceMotion: ReduceMotion.System,
  },
  "standard.fast.spatial": {
    duration: 350,
    easing: Easing.bezier(0.27, 1.06, 0.18, 1.0),
    reduceMotion: ReduceMotion.System,
  },
  "standard.default.spatial": {
    duration: 500,
    easing: Easing.bezier(0.27, 1.06, 0.18, 1.0),
    reduceMotion: ReduceMotion.System,
  },
  "standard.slow.spatial": {
    duration: 750,
    easing: Easing.bezier(0.27, 1.06, 0.18, 1.0),
    reduceMotion: ReduceMotion.System,
  },
  "standard.fast.effects": {
    duration: 150,
    easing: Easing.bezier(0.31, 0.94, 0.34, 1.0),
    reduceMotion: ReduceMotion.System,
  },
  "standard.default.effects": {
    duration: 300,
    easing: Easing.bezier(0.34, 0.88, 0.34, 1.0),
    reduceMotion: ReduceMotion.System,
  },
} as const;
