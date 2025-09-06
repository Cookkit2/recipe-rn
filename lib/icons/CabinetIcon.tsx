import { Icon } from "lucide-react-native";
import { cabinetFiling } from "@lucide/lab";
import {
  iconWithClassName,
  type LucidePropsWithClassName,
} from "lucide-nativewind";

function Cabinet(props: LucidePropsWithClassName) {
  return <Icon iconNode={cabinetFiling} {...props} />;
}

const CabinetIcon = iconWithClassName(Cabinet);

export default CabinetIcon;
