import * as React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { P } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_HEIGHT = 200;
const PADDING = 40;

const COLORS = {
  protein: "#3b82f6", // blue
  carbs: "#f59e0b", // amber
  fat: "#ef4444", // red
} as const;

export interface NutritionChartProps {
  data: Array<{
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  className?: string;
}

function getDayAbbreviation(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function NutritionChart({ data, className }: NutritionChartProps) {
  const renderEmptyState = () => (
    <View className="items-center justify-center py-12">
      <P className="text-muted-foreground text-center">
        No nutrition data available for this period
      </P>
    </View>
  );

  const renderChart = () => {
    if (data.length === 0) {
      return renderEmptyState();
    }

    const chartWidth = CHART_WIDTH - PADDING * 2;
    const chartHeight = CHART_HEIGHT - PADDING * 2;

    const maxCalories = Math.max(...data.map((d) => d.calories), 1);
    const avgCalories = Math.round(data.reduce((sum, d) => sum + d.calories, 0) / data.length);

    const barCount = data.length;
    const barGroupWidth = chartWidth / barCount;
    const barWidth = Math.min(barGroupWidth * 0.6, 32);
    const barGap = (barGroupWidth - barWidth) / 2;

    // Y-axis grid lines
    const gridLines = [];
    const numGridLines = 5;
    for (let i = 0; i <= numGridLines; i++) {
      const y = PADDING + (chartHeight / numGridLines) * i;
      const value = Math.round(maxCalories - (maxCalories / numGridLines) * i);
      gridLines.push({ y, value });
    }

    // Average line Y position
    const avgY = PADDING + chartHeight - (avgCalories / maxCalories) * chartHeight;

    return (
      <View className="mt-2">
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid lines */}
          {gridLines.map((line, index) => (
            <React.Fragment key={`grid-${index}`}>
              <Line
                x1={PADDING}
                y1={line.y}
                x2={CHART_WIDTH - PADDING}
                y2={line.y}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <SvgText x={PADDING - 5} y={line.y + 4} fontSize={10} fill="#9ca3af" textAnchor="end">
                {line.value}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Average calorie line */}
          <Line
            x1={PADDING}
            y1={avgY}
            x2={CHART_WIDTH - PADDING}
            y2={avgY}
            stroke="#6b7280"
            strokeWidth={1}
            strokeDasharray="6 4"
          />
          <SvgText
            x={CHART_WIDTH - PADDING + 2}
            y={avgY - 2}
            fontSize={9}
            fill="#6b7280"
            textAnchor="start"
          >
            avg
          </SvgText>

          {/* Stacked bars */}
          {data.map((item, index) => {
            const barHeight = (item.calories / maxCalories) * chartHeight;
            const x = PADDING + index * barGroupWidth + barGap;

            const totalMacros = item.protein + item.carbs + item.fat || 1;
            const proteinHeight = (item.protein / totalMacros) * barHeight;
            const carbsHeight = (item.carbs / totalMacros) * barHeight;
            const fatHeight = (item.fat / totalMacros) * barHeight;

            const bottomY = PADDING + chartHeight;

            // Protein (bottom)
            const proteinY = bottomY - proteinHeight;
            // Carbs (middle)
            const carbsY = proteinY - carbsHeight;
            // Fat (top)
            const fatY = carbsY - fatHeight;

            return (
              <React.Fragment key={`bar-${index}`}>
                <Rect
                  x={x}
                  y={proteinY}
                  width={barWidth}
                  height={proteinHeight}
                  fill={COLORS.protein}
                />
                <Rect x={x} y={carbsY} width={barWidth} height={carbsHeight} fill={COLORS.carbs} />
                <Rect x={x} y={fatY} width={barWidth} height={fatHeight} fill={COLORS.fat} />
              </React.Fragment>
            );
          })}

          {/* X-axis labels (first, middle, last) */}
          {data.length > 1 && (
            <>
              <SvgText
                x={PADDING + 0 * barGroupWidth + barGap + barWidth / 2}
                y={CHART_HEIGHT - 10}
                fontSize={10}
                fill="#6b7280"
                textAnchor="middle"
              >
                {getDayAbbreviation(data[0]!.date)}
              </SvgText>
              {data.length > 2 &&
                (() => {
                  const midIndex = Math.floor(data.length / 2);
                  const midItem = data[midIndex];
                  return midItem ? (
                    <SvgText
                      x={PADDING + midIndex * barGroupWidth + barGap + barWidth / 2}
                      y={CHART_HEIGHT - 10}
                      fontSize={10}
                      fill="#6b7280"
                      textAnchor="middle"
                    >
                      {getDayAbbreviation(midItem.date)}
                    </SvgText>
                  ) : null;
                })()}
              {(() => {
                const lastIndex = data.length - 1;
                const lastItem = data[lastIndex];
                return lastItem ? (
                  <SvgText
                    x={PADDING + lastIndex * barGroupWidth + barGap + barWidth / 2}
                    y={CHART_HEIGHT - 10}
                    fontSize={10}
                    fill="#6b7280"
                    textAnchor="middle"
                  >
                    {getDayAbbreviation(lastItem.date)}
                  </SvgText>
                ) : null;
              })()}
            </>
          )}
        </Svg>

        {/* Legend */}
        <View className="flex-row items-center justify-center mt-3 gap-4">
          <View className="flex-row items-center gap-1">
            <View style={[styles.legendDot, { backgroundColor: COLORS.protein }]} />
            <P className="text-xs text-muted-foreground">Protein</P>
          </View>
          <View className="flex-row items-center gap-1">
            <View style={[styles.legendDot, { backgroundColor: COLORS.carbs }]} />
            <P className="text-xs text-muted-foreground">Carbs</P>
          </View>
          <View className="flex-row items-center gap-1">
            <View style={[styles.legendDot, { backgroundColor: COLORS.fat }]} />
            <P className="text-xs text-muted-foreground">Fat</P>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Card
      className={cn("mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none", className)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="font-urbanist-bold">Weekly Nutrition</CardTitle>
      </CardHeader>
      <CardContent>{renderChart()}</CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default NutritionChart;
