import { Icon, type LucideProps } from "lucide-react-native";
import { starNorth } from "@lucide/lab";
import { cssInterop } from "nativewind";

const StarNorthIcon = (props: LucideProps) => (
  <Icon iconNode={starNorth} {...props} />
);

// Apply cssInterop directly to the StarNorthIcon
cssInterop(StarNorthIcon, {
  className: {
    target: "style",
    nativeStyleToProp: {
      color: true,
      opacity: true,
    },
  },
});

export { StarNorthIcon };
