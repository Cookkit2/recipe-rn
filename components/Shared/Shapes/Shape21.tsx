import * as React from "react";
import Svg, { type SvgProps, Path } from "react-native-svg";
import { memo } from "react";

const Shape21 = (props: SvgProps) => (
  <Svg
    width={props.width || 28}
    height={props.height || 28}
    viewBox="0 0 320 320"
    fill="none"
    {...props}
  >
    <Path
      fill={props.color || "#D0BCFF"}
      d="M320 160C320 248.366 248.366 320 160 320C71.6344 320 -1e-05 248.366 0 160C0 71.6344 71.6345 -7.72516e-06 160 0C248.366 7.72516e-06 320 71.6345 320 160Z"
    />
  </Svg>
);
export default memo(Shape21);
