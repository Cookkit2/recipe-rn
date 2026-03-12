import * as React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Path, Line, Rect, Text as SvgText } from "react-native-svg";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { P } from "~/components/ui/typography";
import { cn } from "~/lib/utils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_WIDTH = SCREEN_WIDTH - 48; // Account for margins (mx-6 = 24px each side)
const CHART_HEIGHT = 200;
const PADDING = 40;

export type ChartMetric = "quantity" | "cost" | "count";

export interface WasteChartProps {
  data: Array<{
    date: number;
    quantity: number;
    cost: number;
    count: number;
  }>;
  metric?: ChartMetric;
  title?: string;
  description?: string;
  className?: string;
  groupBy?: "day" | "week" | "month";
}

interface ChartDataPoint {
  x: number;
  y: number;
  value: number;
  label: string;
}

export function WasteChart({
  data,
  metric = "quantity",
  title = "Waste Trends",
  description,
  className,
  groupBy = "day",
}: WasteChartProps) {
  const formatDateLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    if (groupBy === "day") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (groupBy === "week") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short" });
    }
  };

  const formatValue = (value: number, metric: ChartMetric) => {
    if (metric === "cost") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toString();
  };

  const getMetricLabel = () => {
    switch (metric) {
      case "quantity":
        return "Quantity";
      case "cost":
        return "Cost";
      case "count":
        return "Entries";
      default:
        return "Value";
    }
  };

  const getChartColor = () => {
    switch (metric) {
      case "quantity":
        return "#f59e0b"; // amber-500
      case "cost":
        return "#ec4899"; // pink-500
      case "count":
        return "#8b5cf6"; // violet-500
      default:
        return "#0ea5e9"; // sky-500
    }
  };

  // Transform data into chart coordinates
  const processData = (): {
    points: ChartDataPoint[];
    maxValue: number;
    minValue: number;
  } => {
    if (data.length === 0) {
      return { points: [], maxValue: 0, minValue: 0 };
    }

    const values = data.map((d) => d[metric]);
    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values, 0);

    const chartWidth = CHART_WIDTH - PADDING * 2;
    const chartHeight = CHART_HEIGHT - PADDING * 2;

    const points: ChartDataPoint[] = data.map((item, index) => {
      const x = PADDING + (index / Math.max(data.length - 1, 1)) * chartWidth;
      const normalizedValue = (item[metric] - minValue) / (maxValue - minValue || 1);
      const y = PADDING + chartHeight - normalizedValue * chartHeight;

      return {
        x,
        y,
        value: item[metric],
        label: formatDateLabel(item.date),
      };
    });

    return { points, maxValue, minValue };
  };

  const { points, maxValue } = processData();

  const renderEmptyState = () => (
    <View className="items-center justify-center py-12">
      <P className="text-muted-foreground text-center">No waste data available for this period</P>
    </View>
  );

  const renderChart = () => {
    if (points.length === 0) {
      return renderEmptyState();
    }

    const chartColor = getChartColor();
    const chartWidth = CHART_WIDTH - PADDING * 2;
    const chartHeight = CHART_HEIGHT - PADDING * 2;

    // Create smooth curve path
    let pathD = "";
    let areaPathD = "";

    if (points.length === 1) {
      // Single point - draw a horizontal line with dot
      const x = points[0]?.x ?? PADDING;
      const y = points[0]?.y ?? CHART_HEIGHT / 2;
      pathD = `M ${PADDING} ${y} L ${CHART_WIDTH - PADDING} ${y}`;
      areaPathD = `M ${PADDING} ${y} L ${CHART_WIDTH - PADDING} ${y} L ${CHART_WIDTH - PADDING} ${CHART_HEIGHT - PADDING} L ${PADDING} ${CHART_HEIGHT - PADDING} Z`;
    } else {
      // Multiple points - draw smooth curve
      points.forEach((point, index) => {
        if (index === 0) {
          pathD += `M ${point.x} ${point.y}`;
          areaPathD += `M ${point.x} ${point.y}`;
        } else {
          // Simple bezier curve for smoothness
          const prevPoint = points[index - 1];
          if (!prevPoint) return;
          const controlX1 = prevPoint.x + (point.x - prevPoint.x) * 0.5;
          const controlX2 = point.x - (point.x - prevPoint.x) * 0.5;
          pathD += ` C ${controlX1} ${prevPoint.y}, ${controlX2} ${point.y}, ${point.x} ${point.y}`;
          areaPathD += ` C ${controlX1} ${prevPoint.y}, ${controlX2} ${point.y}, ${point.x} ${point.y}`;
        }

        if (index === points.length - 1) {
          // Close the area path
          const firstPoint = points[0];
          if (firstPoint) {
            areaPathD += ` L ${point.x} ${CHART_HEIGHT - PADDING} L ${firstPoint.x} ${CHART_HEIGHT - PADDING} Z`;
          }
        }
      });
    }

    // Y-axis grid lines and labels
    const gridLines = [];
    const numGridLines = 5;
    for (let i = 0; i <= numGridLines; i++) {
      const y = PADDING + (chartHeight / numGridLines) * i;
      const value = maxValue - (maxValue / numGridLines) * i;
      gridLines.push({ y, value });
    }

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
              <SvgText
                x={PADDING - 5}
                y={line.y + 4}
                fontSize={10}
                fill="#9ca3af"
                textAnchor="end"
              >
                {formatValue(Math.round(line.value), metric)}
              </SvgText>
            </React.Fragment>
          ))}

          {/* Area fill under the line */}
          {points.length > 1 && (
            <Path
              d={areaPathD}
              fill={chartColor}
              fillOpacity={0.1}
            />
          )}

          {/* Line chart */}
          <Path
            d={pathD}
            stroke={chartColor}
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {points.map((point, index) => (
            <React.Fragment key={`point-${index}`}>
              <Rect
                x={point.x - 6}
                y={point.y - 6}
                width={12}
                height={12}
                rx={6}
                fill={chartColor}
              />
              <Rect
                x={point.x - 3}
                y={point.y - 3}
                width={6}
                height={6}
                rx={3}
                fill="white"
              />
            </React.Fragment>
          ))}

          {/* X-axis labels (show first, middle, last) */}
          {points.length > 1 && points[0] && (
            <>
              <SvgText
                x={points[0].x}
                y={CHART_HEIGHT - 10}
                fontSize={10}
                fill="#6b7280"
                textAnchor="start"
              >
                {points[0].label}
              </SvgText>
              {points.length > 2 && (() => {
                const midIndex = Math.floor(points.length / 2);
                const midPoint = points[midIndex];
                return midPoint ? (
                  <SvgText
                    x={midPoint.x}
                    y={CHART_HEIGHT - 10}
                    fontSize={10}
                    fill="#6b7280"
                    textAnchor="middle"
                  >
                    {midPoint.label}
                  </SvgText>
                ) : null;
              })()}
              {(() => {
                const lastIndex = points.length - 1;
                const lastPoint = points[lastIndex];
                return lastPoint ? (
                  <SvgText
                    x={lastPoint.x}
                    y={CHART_HEIGHT - 10}
                    fontSize={10}
                    fill="#6b7280"
                    textAnchor="end"
                  >
                      {lastPoint.label}
                  </SvgText>
                ) : null;
              })()}
            </>
          )}
        </Svg>

        {/* Legend */}
        <View className="flex-row items-center justify-center mt-3 gap-2">
          <View style={[styles.legendDot, { backgroundColor: chartColor }]} />
          <P className="text-xs text-muted-foreground">
            {getMetricLabel()}
          </P>
        </View>
      </View>
    );
  };

  return (
    <Card className={cn("mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="font-urbanist-bold">{title}</CardTitle>
        {description && (
          <P className="text-sm text-foreground/70 font-urbanist-medium mt-1">
            {description}
          </P>
        )}
      </CardHeader>
      <CardContent>
        {renderChart()}
      </CardContent>
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

export default WasteChart;
