import * as React from "react";
import Svg, { type SvgProps, Path } from "react-native-svg";
import { memo } from "react";

const Shape18 = (props: SvgProps) => (
  <Svg
    width={props.width || 28}
    height={props.height || 28}
    viewBox="0 0 320 320"
    fill="none"
    {...props}
  >
    <Path
      fill={props.color || "#D0BCFF"}
      d="M308.58 160C334.43 208.16 314.9 251.77 265.07 265.06C251.77 314.9 208.16 334.42 160 308.58C111.83 334.43 68.2201 314.9 54.9301 265.07C5.10006 251.77 -14.4299 208.16 11.4201 160C-14.4299 111.83 5.10006 68.2198 54.9301 54.9298C68.2201 5.09982 111.83 -14.4302 160 11.4198C208.16 -14.4302 251.77 5.09982 265.06 54.9298C314.9 68.2198 334.42 111.83 308.58 160Z"
    />
  </Svg>
);
export default memo(Shape18);
