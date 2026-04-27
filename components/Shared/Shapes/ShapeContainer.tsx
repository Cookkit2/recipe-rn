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
import { View, type DimensionValue } from "react-native";
import { P } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

interface ShapeContainerProps extends Omit<SvgProps, "width" | "height"> {
  width?: DimensionValue;
  height?: DimensionValue;
  index: number;
  text: string;
  textClassname?: string;
}

export default function ShapeContainer({
  index,
  text,
  textClassname,
  width,
  height,
  ...props
}: ShapeContainerProps) {
  let currentShape;

  const svgProps: SvgProps = {
    ...props,
    width: typeof width === "number" || typeof width === "string" ? width : undefined,
    height: typeof height === "number" || typeof height === "string" ? height : undefined,
  };
  switch (index) {
    case 0:
      currentShape = <Shape1 {...svgProps} />;
      break;
    case 1:
      currentShape = <Shape2 {...svgProps} />;
      break;
    case 2:
      currentShape = <Shape3 {...svgProps} />;
      break;
    case 3:
      currentShape = <Shape4 {...svgProps} />;
      break;
    case 4:
      currentShape = <Shape5 {...svgProps} />;
      break;
    case 5:
      currentShape = <Shape6 {...svgProps} />;
      break;
    case 6:
      currentShape = <Shape7 {...svgProps} />;
      break;
    case 7:
      currentShape = <Shape8 {...svgProps} />;
      break;
    case 8:
      currentShape = <Shape9 {...svgProps} />;
      break;
    case 9:
      currentShape = <Shape10 {...svgProps} />;
      break;
    case 10:
      currentShape = <Shape11 {...svgProps} />;
      break;
    case 11:
      currentShape = <Shape12 {...svgProps} />;
      break;
    case 12:
      currentShape = <Shape13 {...svgProps} />;
      break;
    case 13:
      currentShape = <Shape14 {...svgProps} />;
      break;
    case 14:
      currentShape = <Shape15 {...svgProps} />;
      break;
    case 15:
      currentShape = <Shape16 {...svgProps} />;
      break;
    case 16:
      currentShape = <Shape17 {...svgProps} />;
      break;
    case 17:
      currentShape = <Shape18 {...svgProps} />;
      break;
    case 18:
      currentShape = <Shape19 {...svgProps} />;
      break;
    case 19:
      currentShape = <Shape20 {...svgProps} />;
      break;
    case 20:
      currentShape = <Shape21 {...svgProps} />;
      break;
    default:
      currentShape = <Shape1 {...svgProps} />;
      break;
  }

  return (
    <View
      className="relative"
      style={{
        width: width,
        height: height,
      }}
    >
      {currentShape}
      <View className="absolute inset-0 flex items-center justify-center">
        <P className={cn("text-primary-foreground font-bowlby-one text-center", textClassname)}>
          {text}
        </P>
      </View>
    </View>
  );
}
