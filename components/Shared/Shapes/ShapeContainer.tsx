import React from "react";
import { type SvgProps } from "react-native-svg";
import Shape1 from "./Shape1";
import Shape2 from "./Shape2";
import Shape3 from "./Shape3";
import Shape4 from "./Shape4";
import Shape5 from "./Shape5";
import Shape6 from "./Shape6";
import Shape7 from "./Shape7";
import Shape8 from "./Shape8";
import Shape9 from "./Shape9";
import Shape10 from "./Shape10";
import Shape11 from "./Shape11";
import Shape12 from "./Shape12";
import Shape13 from "./Shape13";
import Shape14 from "./Shape14";
import Shape15 from "./Shape15";
import Shape16 from "./Shape16";
import Shape17 from "./Shape17";
import Shape18 from "./Shape18";
import Shape19 from "./Shape19";
import Shape20 from "./Shape20";
import Shape21 from "./Shape21";
import { View } from "react-native";
import { P } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

interface ShapeContainerProps extends SvgProps {
  index: number;
  text: string;
  textClassname?: string;
}

export default function ShapeContainer({
  index,
  text,
  textClassname,
  ...props
}: ShapeContainerProps) {
  let currentShape;
  switch (index) {
    case 0:
      currentShape = <Shape1 {...props} />;
      break;
    case 1:
      currentShape = <Shape2 {...props} />;
      break;
    case 2:
      currentShape = <Shape3 {...props} />;
      break;
    case 3:
      currentShape = <Shape4 {...props} />;
      break;
    case 4:
      currentShape = <Shape5 {...props} />;
      break;
    case 5:
      currentShape = <Shape6 {...props} />;
      break;
    case 6:
      currentShape = <Shape7 {...props} />;
      break;
    case 7:
      currentShape = <Shape8 {...props} />;
      break;
    case 8:
      currentShape = <Shape9 {...props} />;
      break;
    case 9:
      currentShape = <Shape10 {...props} />;
      break;
    case 10:
      currentShape = <Shape11 {...props} />;
      break;
    case 11:
      currentShape = <Shape12 {...props} />;
      break;
    case 12:
      currentShape = <Shape13 {...props} />;
      break;
    case 13:
      currentShape = <Shape14 {...props} />;
      break;
    case 14:
      currentShape = <Shape15 {...props} />;
      break;
    case 15:
      currentShape = <Shape16 {...props} />;
      break;
    case 16:
      currentShape = <Shape17 {...props} />;
      break;
    case 17:
      currentShape = <Shape18 {...props} />;
      break;
    case 18:
      currentShape = <Shape19 {...props} />;
      break;
    case 19:
      currentShape = <Shape20 {...props} />;
      break;
    case 20:
      currentShape = <Shape21 {...props} />;
      break;
    default:
      currentShape = <Shape1 {...props} />;
      break;
  }

  return (
    <View
      className="relative"
      style={{
        width: props.width as any,
        height: props.height as any,
      }}
    >
      {currentShape}
      <View className="absolute inset-0 flex items-center justify-center">
        <P
          className={cn(
            "text-primary-foreground font-bowlby-one text-center",
            textClassname
          )}
        >
          {text}
        </P>
      </View>
    </View>
  );
}
