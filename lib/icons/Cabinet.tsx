import React from "react";
import { Svg, Path, Rect } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const CabinetIcon = ({ size = 24, color = "currentColor", ...props }: IconProps) => {
  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth={2} 
      strokeLinecap="round" 
      strokeLinejoin="round"
      {...props}
    >
      <Rect x="3" y="3" width="18" height="18" rx="2" />
      <Path d="M9 3v18" />
      <Path d="M15 3v18" />
      <Path d="M3 9h18" />
      <Path d="M3 15h18" />
      <Path d="M6 6h.01" />
      <Path d="M6 12h.01" />
      <Path d="M12 6h.01" />
      <Path d="M12 12h.01" />
      <Path d="M18 6h.01" />
      <Path d="M18 12h.01" />
    </Svg>
  );
};

export { CabinetIcon };
