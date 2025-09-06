import { Icon } from "lucide-react-native";
import { starNorth } from "@lucide/lab";
import {
  iconWithClassName,
  type LucidePropsWithClassName,
} from "lucide-nativewind";

function StarNorth(props: LucidePropsWithClassName) {
  return <Icon iconNode={starNorth} {...props} />;
}

export const StarNorthIcon = iconWithClassName(StarNorth);
