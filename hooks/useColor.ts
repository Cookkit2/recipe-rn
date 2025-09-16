import { useColorScheme } from "./useColorScheme";
import colors from "~/constants/colors.json";

export default function useColors() {
  const { colorScheme } = useColorScheme();
  return colors[colorScheme];
}

export function useLightColors() {
  return colors.light;
}
