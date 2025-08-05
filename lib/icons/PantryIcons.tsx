import {
  AppleIcon,
  RefrigeratorIcon,
  SnowflakeIcon,
  Icon,
  type LucideProps,
} from "lucide-react-native";
import { cabinetFiling } from "@lucide/lab";
import { iconWithClassName } from "./iconWithClassName";
import { cssInterop } from "nativewind";

iconWithClassName(AppleIcon);
iconWithClassName(RefrigeratorIcon);
iconWithClassName(SnowflakeIcon);

const CabinetIcon = (props: LucideProps) => (
  <Icon iconNode={cabinetFiling} {...props} />
);

// Apply cssInterop directly to the CabinetIcon
cssInterop(CabinetIcon, {
  className: {
    target: "style",
    nativeStyleToProp: {
      color: true,
      opacity: true,
    },
  },
});

export { AppleIcon, RefrigeratorIcon, SnowflakeIcon, CabinetIcon };
