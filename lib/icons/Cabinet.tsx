import { Icon, type LucideProps } from "lucide-react-native";
import { cabinetFiling } from "@lucide/lab";
import { cssInterop } from "nativewind";

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

export { CabinetIcon };
