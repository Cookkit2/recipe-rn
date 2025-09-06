import React from "react";
import { Svg, Path } from "react-native-svg";

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
}

const StarNorthIcon = ({ size = 24, color = "currentColor", ...props }: IconProps) => {
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
      <Path d="m14.447 3.027 1.527 4.698a1 1 0 0 0 .606.606l4.698 1.526c.43.14.43.734 0 .874l-4.698 1.526a1 1 0 0 0-.606.606l-1.526 4.698c-.14.43-.734.43-.874 0l-1.526-4.698a1 1 0 0 0-.606-.606L6.342 10.73c-.43-.14-.43-.734 0-.874l4.698-1.526a1 1 0 0 0 .606-.606l1.526-4.698c.14-.43.734-.43.874 0Z" />
    </Svg>
  );
};

export { StarNorthIcon };
