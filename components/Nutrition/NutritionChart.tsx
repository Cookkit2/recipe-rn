import * as React from "react";
import { View } from "react-native";
import Svg, { Line, Rect, Text as SvgText } from "react-native-svg";
import {
  CHART_WIDTH,
  CHART_HEIGHT,
  CHART_PADDING,
  ChartEmptyState,
  ChartCard,
  ChartLegend,
  buildGridLines,
  renderGridLines,
} from "~/components/Shared/ChartPrimitives";

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
  const renderChart = () => {
    if (data.length === 0) {
      return <ChartEmptyState message="No nutrition data available for this period" />;
    }

    const innerWidth = CHART_WIDTH - CHART_PADDING * 2;
    const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;

    let maxCalories = 1;
    let totalCalories = 0;
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item) {
        if (item.calories > maxCalories) {
          maxCalories = item.calories;
        }
        totalCalories += item.calories;
      }
    }
    const avgCalories = Math.round(totalCalories / data.length);

    const barCount = data.length;
    const barGroupWidth = innerWidth / barCount;
    const barWidth = Math.min(barGroupWidth * 0.6, 32);
    const barGap = (barGroupWidth - barWidth) / 2;

    // Y-axis grid lines
    const gridLines = buildGridLines(maxCalories);

    // Average line Y position
    const avgY = CHART_PADDING + innerHeight - (avgCalories / maxCalories) * innerHeight;

    return (
      <View className="mt-2">
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid lines */}
          {renderGridLines(gridLines)}

          {/* Average calorie line */}
          <Line
            x1={CHART_PADDING}
            y1={avgY}
            x2={CHART_WIDTH - CHART_PADDING}
            y2={avgY}
            stroke="#6b7280"
            strokeWidth={1}
            strokeDasharray="6 4"
          />
          <SvgText
            x={CHART_WIDTH - CHART_PADDING + 2}
            y={avgY - 2}
            fontSize={9}
            fill="#6b7280"
            textAnchor="start"
          >
            avg
          </SvgText>

          {/* Stacked bars */}
          {data.map((item, index) => {
            const barHeight = (item.calories / maxCalories) * innerHeight;
            const x = CHART_PADDING + index * barGroupWidth + barGap;

            const totalMacros = item.protein + item.carbs + item.fat || 1;
            const proteinHeight = (item.protein / totalMacros) * barHeight;
            const carbsHeight = (item.carbs / totalMacros) * barHeight;
            const fatHeight = (item.fat / totalMacros) * barHeight;

            const bottomY = CHART_PADDING + innerHeight;

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
                x={CHART_PADDING + 0 * barGroupWidth + barGap + barWidth / 2}
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
                      x={CHART_PADDING + midIndex * barGroupWidth + barGap + barWidth / 2}
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
                    x={CHART_PADDING + lastIndex * barGroupWidth + barGap + barWidth / 2}
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
        <ChartLegend
          entries={[
            { color: COLORS.protein, label: "Protein" },
            { color: COLORS.carbs, label: "Carbs" },
            { color: COLORS.fat, label: "Fat" },
          ]}
        />
      </View>
    );
  };

  return (
    <ChartCard title="Weekly Nutrition" className={className}>
      {renderChart()}
    </ChartCard>
  );
}

export default NutritionChart;
