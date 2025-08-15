import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import {
  StatusBar as RNStatusBar,
  StatusBar,
  StyleSheet,
  type ColorValue,
  type StatusBarStyle,
  type ViewStyle,
} from "react-native";
import { type Edge, SafeAreaView } from "react-native-safe-area-context";

export interface GradientConfig {
  colors: string[];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  locations?: number[];
  shouldRasterizeIOS?: boolean;
  dither?: boolean;
}

export interface SafeAreaWrapperProps {
  children: React.ReactNode;
  statusBarStyle?: StatusBarStyle;
  statusBarHidden?: boolean;
  statusBarTranslucent?: boolean;
  statusBarBackgroundColor?: string;
  edges?: Edge[];
  backgroundColor?: string;
  className?: string;
  style?: ViewStyle;
  gradient?: GradientConfig | false;
  gradientStyle?: ViewStyle;
  theme?:
    | "default"
    | "dark"
    | "light"
    | "purple"
    | "green"
    | "orange"
    | "custom";
  testID?: string;
}

const GRADIENT_THEMES: Record<string, GradientConfig> = {
  default: {
    colors: ["#3b82f6", "#00000000"],
    start: { x: 2.2, y: 0.1 },
    end: { x: 1.4, y: 1 },
    shouldRasterizeIOS: true,
    dither: false,
  },
  dark: {
    colors: ["#1f2937", "#00000000"],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    shouldRasterizeIOS: true,
    dither: false,
  },
  light: {
    colors: ["#f3f4f6", "#ffffff00"],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    shouldRasterizeIOS: true,
    dither: false,
  },
  purple: {
    colors: ["#8b5cf6", "#a855f7", "#00000000"],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
    shouldRasterizeIOS: true,
    dither: false,
  },
  green: {
    colors: ["#10b981", "#059669", "#00000000"],
    start: { x: 1, y: 0 },
    end: { x: 0, y: 1 },
    shouldRasterizeIOS: true,
    dither: false,
  },
  orange: {
    colors: ["#f59e0b", "#d97706", "#00000000"],
    start: { x: 0.5, y: 0 },
    end: { x: 0.5, y: 1 },
    shouldRasterizeIOS: true,
    dither: false,
  },
};

const THEME_CONFIGS = {
  default: {
    backgroundColor: "#000000",
    statusBarStyle: "light-content" as StatusBarStyle,
    gradient: GRADIENT_THEMES.default,
  },
  dark: {
    backgroundColor: "#000000",
    statusBarStyle: "light-content" as StatusBarStyle,
    gradient: GRADIENT_THEMES.dark,
  },
  light: {
    backgroundColor: "#ffffff",
    statusBarStyle: "dark-content" as StatusBarStyle,
    gradient: GRADIENT_THEMES.light,
  },
  purple: {
    backgroundColor: "#1f1b2e",
    statusBarStyle: "light-content" as StatusBarStyle,
    gradient: GRADIENT_THEMES.purple,
  },
  green: {
    backgroundColor: "#064e3b",
    statusBarStyle: "light-content" as StatusBarStyle,
    gradient: GRADIENT_THEMES.green,
  },
  orange: {
    backgroundColor: "#451a03",
    statusBarStyle: "light-content" as StatusBarStyle,
    gradient: GRADIENT_THEMES.orange,
  },
};

const SafeAreaWrapper: React.FC<SafeAreaWrapperProps> = ({
  children,
  statusBarStyle,
  statusBarHidden = false,
  statusBarTranslucent = false,
  statusBarBackgroundColor,
  edges = ["top", "left", "right", "bottom"],
  backgroundColor,
  className = "flex-1",
  style,
  gradient,
  gradientStyle,
  theme = "default",
  testID,
}) => {
  const themeConfig = theme !== "custom" ? THEME_CONFIGS[theme] : null;

  const finalBackgroundColor =
    backgroundColor || themeConfig?.backgroundColor || "#000000";
  const finalStatusBarStyle =
    statusBarStyle ||
    themeConfig?.statusBarStyle ||
    ("light-content" as StatusBarStyle);
  const finalGradient =
    gradient !== false ? gradient || themeConfig?.gradient : false;

  const safeAreaClassName = `flex-1 ${className} ${
    backgroundColor ? "" : theme === "light" ? "bg-white" : "bg-black"
  }`;

  useEffect(() => {
    RNStatusBar.setBarStyle(finalStatusBarStyle, true);
    if (!statusBarTranslucent) {
      RNStatusBar.setBackgroundColor(
        statusBarBackgroundColor || finalBackgroundColor,
        true
      );
    }
  }, [
    finalStatusBarStyle,
    statusBarTranslucent,
    statusBarBackgroundColor,
    finalBackgroundColor,
  ]);

  return (
    <SafeAreaView
      className={safeAreaClassName}
      style={[{ backgroundColor: finalBackgroundColor }, style]}
      edges={edges}
      testID={testID}
    >
      <StatusBar
        barStyle={finalStatusBarStyle}
        hidden={statusBarHidden}
        translucent={statusBarTranslucent}
        backgroundColor={statusBarBackgroundColor || finalBackgroundColor}
      />

      {finalGradient && (
        <LinearGradient
          colors={
            finalGradient.colors as [ColorValue, ColorValue, ...ColorValue[]]
          }
          start={finalGradient.start}
          end={finalGradient.end}
          locations={
            finalGradient.locations as [number, number, ...number[]] | null
          }
          shouldRasterizeIOS={finalGradient.shouldRasterizeIOS}
          dither={finalGradient.dither}
          style={[styles.gradient, gradientStyle]}
        />
      )}

      {children}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  gradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
});

export default SafeAreaWrapper;
export { GRADIENT_THEMES, THEME_CONFIGS };
