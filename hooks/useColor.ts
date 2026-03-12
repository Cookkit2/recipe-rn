import type { ColorValue } from "react-native";
import { useCSSVariable } from "uniwind";

const COLOR_VARIABLES = [
  "--color-background",
  "--color-foreground",
  "--color-card",
  "--color-card-foreground",
  "--color-popover",
  "--color-popover-foreground",
  "--color-primary",
  "--color-primary-foreground",
  "--color-secondary",
  "--color-secondary-foreground",
  "--color-muted",
  "--color-muted-foreground",
  "--color-accent",
  "--color-accent-foreground",
  "--color-destructive",
  "--color-destructive-foreground",
  "--color-border",
  "--color-input",
  "--color-ring",
] as const;

const LIGHT_COLOR_VARIABLES = [
  "--color-light-background",
  "--color-light-foreground",
  "--color-light-card",
  "--color-light-card-foreground",
  "--color-light-popover",
  "--color-light-popover-foreground",
  "--color-light-primary",
  "--color-light-primary-foreground",
  "--color-light-secondary",
  "--color-light-secondary-foreground",
  "--color-light-muted",
  "--color-light-muted-foreground",
  "--color-light-accent",
  "--color-light-accent-foreground",
  "--color-light-destructive",
  "--color-light-destructive-foreground",
  "--color-light-border",
  "--color-light-input",
  "--color-light-ring",
] as const;

/**
 * Custom hook for accessing theme color values from CSS variables
 *
 * Reads color values from CSS custom properties (variables) defined in the theme.
 * Returns the current theme's colors which automatically update when theme changes.
 *
 * @returns Object containing color values as strings for the current theme
 * @returns {string} background - Background color for the current theme
 * @returns {string} foreground - Foreground/text color for the current theme
 * @returns {string} card - Card background color
 * @returns {string} cardForeground - Card foreground/text color
 * @returns {string} popover - Popover background color
 * @returns {string} popoverForeground - Popover foreground/text color
 * @returns {string} primary - Primary color for main actions and highlights
 * @returns {string} primaryForeground - Foreground color for primary-colored elements
 * @returns {string} secondary - Secondary color for less prominent elements
 * @returns {string} secondaryForeground - Foreground color for secondary-colored elements
 * @returns {string} muted - Muted color for subdued content
 * @returns {string} mutedForeground - Foreground color for muted-colored elements
 * @returns {string} accent - Accent color for highlights and emphasis
 * @returns {string} accentForeground - Foreground color for accent-colored elements
 * @returns {string} destructive - Destructive/error color (red)
 * @returns {string} destructiveForeground - Foreground color for destructive-colored elements
 * @returns {string} border - Border color for outlines and dividers
 * @returns {string} input - Input field background/border color
 * @returns {string} ring - Focus ring color for accessibility
 *
 * @example
 * ```ts
 * const { primary, background, foreground } = useColors();
 * ```
 */
export default function useColors() {
  const values = useCSSVariable([...COLOR_VARIABLES]);

  return {
    background: values[0]!.toString(),
    foreground: values[1]!.toString(),
    card: values[2]!.toString(),
    cardForeground: values[3]!.toString(),
    popover: values[4]!.toString(),
    popoverForeground: values[5]!.toString(),
    primary: values[6]!.toString(),
    primaryForeground: values[7]!.toString(),
    secondary: values[8]!.toString(),
    secondaryForeground: values[9]!.toString(),
    muted: values[10]!.toString(),
    mutedForeground: values[11]!.toString(),
    accent: values[12]!.toString(),
    accentForeground: values[13]!.toString(),
    destructive: values[14]!.toString(),
    destructiveForeground: values[15]!.toString(),
    border: values[16]!.toString(),
    input: values[17]!.toString(),
    ring: values[18]!.toString(),
  };
}

/**
 * Custom hook for accessing light theme color values regardless of current theme
 *
 * Reads color values from static light theme CSS custom properties (variables)
 * defined in the @theme static block. Returns light colors even when dark mode is active.
 *
 * @returns Object containing light theme color values as strings
 * @returns {string} background - Light theme background color
 * @returns {string} foreground - Light theme foreground/text color
 * @returns {string} card - Light theme card background color
 * @returns {string} cardForeground - Light theme card foreground/text color
 * @returns {string} popover - Light theme popover background color
 * @returns {string} popoverForeground - Light theme popover foreground/text color
 * @returns {string} primary - Light theme primary color
 * @returns {string} primaryForeground - Light theme primary foreground color
 * @returns {string} secondary - Light theme secondary color
 * @returns {string} secondaryForeground - Light theme secondary foreground color
 * @returns {string} muted - Light theme muted color
 * @returns {string} mutedForeground - Light theme muted foreground color
 * @returns {string} accent - Light theme accent color
 * @returns {string} accentForeground - Light theme accent foreground color
 * @returns {string} destructive - Light theme destructive/error color
 * @returns {string} destructiveForeground - Light theme destructive foreground color
 * @returns {string} border - Light theme border color
 * @returns {string} input - Light theme input field color
 * @returns {string} ring - Light theme focus ring color
 *
 * @example
 * ```ts
 * const { primary, background } = useLightColors();
 * ```
 */
export function useLightColors() {
  const values = useCSSVariable([...LIGHT_COLOR_VARIABLES]);

  return {
    background: values[0]!.toString(),
    foreground: values[1]!.toString(),
    card: values[2]!.toString(),
    cardForeground: values[3]!.toString(),
    popover: values[4]!.toString(),
    popoverForeground: values[5]!.toString(),
    primary: values[6]!.toString(),
    primaryForeground: values[7]!.toString(),
    secondary: values[8]!.toString(),
    secondaryForeground: values[9]!.toString(),
    muted: values[10]!.toString(),
    mutedForeground: values[11]!.toString(),
    accent: values[12]!.toString(),
    accentForeground: values[13]!.toString(),
    destructive: values[14]!.toString(),
    destructiveForeground: values[15]!.toString(),
    border: values[16]!.toString(),
    input: values[17]!.toString(),
    ring: values[18]!.toString(),
  };
}
