import colors from "./colors.json";

// Navigation theme colors
export const NAV_THEME = {
  light: {
    background: colors.light.background, // background
    border: colors.light.border, // border
    card: colors.light.card, // card
    notification: colors.light.destructive, // destructive
    primary: colors.light.primary, // primary
    text: colors.light.foreground, // foreground
  },
  dark: {
    background: colors.dark.background, // background
    border: colors.dark.border, // border
    card: colors.dark.card, // card
    notification: colors.dark.destructive, // destructive
    primary: colors.dark.primary, // primary
    text: colors.dark.foreground, // foreground
  },
};
