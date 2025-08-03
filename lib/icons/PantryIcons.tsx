import {
  AppleIcon,
  RefrigeratorIcon,
  SnowflakeIcon,
  Icon,
} from "lucide-react-native";
import { cabinetFiling } from "@lucide/lab";
import { iconWithClassName } from "./iconWithClassName";

iconWithClassName(AppleIcon);
iconWithClassName(RefrigeratorIcon);
iconWithClassName(SnowflakeIcon);

const CabinetIcon = (props: any) => (
  <Icon iconNode={cabinetFiling} {...props} />
);

export { AppleIcon, RefrigeratorIcon, SnowflakeIcon, CabinetIcon };
