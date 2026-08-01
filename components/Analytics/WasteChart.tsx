import * as React from "react";
import { View } from "react-native";
import Svg, { Path, Rect, Text as SvgText } from "react-native-svg";
import { P } from "~/components/ui/typography";
import {
  CHART_WIDTH,
  CHART_HEIGHT,
  CHART_PADDING,
  ChartEmptyState,
  ChartCard,
  ChartLegend,
  buildGridLines,
  renderGridLines,
  type LegendEntry,
} from "~/components/Shared/ChartPrimitives";

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

const METRIC_LABELS: Record<ChartMetric, string> = {
  quantity: "Quantity",
  cost: "Cost",
  count: "Entries",
};

const METRIC_COLORS: Record<ChartMetric, string> = {
  quantity: "#f59e0b", // amber-500
  cost: "#ec4899", // pink-500
  count: "#8b5cf6", // violet-500
};

function WasteChart({
  data,
  metric = "quantity",
  title = "Waste Trends",
  description,
  className,
  groupBy = "day",
}: WasteChartProps) {
  const formatDateLabel = (timestamp: number) => {
    const date = new Date(timestamp);
    if (groupBy === "month") {
      return date.toLocaleDateString("en-US", { month: "short" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatValue = (value: number, m: ChartMetric) => {
    if (m === "cost") {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return value.toString();
  };

  const chartColor = METRIC_COLORS[metric] ?? "#0ea5e9";

  // Transform data into chart coordinates
  const processData = (): {
    points: ChartDataPoint[];
    maxValue: number;
    minValue: number;
  } => {
    if (data.length === 0) {
      return { points: [], maxValue: 0, minValue: 0 };
    }

    let maxValue = 1;
    let minValue = 0;
    for (let i = 0; i < data.length; i++) {
      const val = data[i]![metric];
      if (val > maxValue) maxValue = val;
      if (val < minValue) minValue = val;
    }
    // maxValue handled in loop
    // minValue handled in loop

    const innerWidth = CHART_WIDTH - CHART_PADDING * 2;
    const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;

    const points: ChartDataPoint[] = data.map((item, index) => {
      const x = CHART_PADDING + (index / Math.max(data.length - 1, 1)) * innerWidth;
      const normalizedValue = (item[metric] - minValue) / (maxValue - minValue || 1);
      const y = CHART_PADDING + innerHeight - normalizedValue * innerHeight;

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

  const renderChart = () => {
    if (points.length === 0) {
      return <ChartEmptyState message="No waste data available for this period" />;
    }

    const innerWidth = CHART_WIDTH - CHART_PADDING * 2;
    const innerHeight = CHART_HEIGHT - CHART_PADDING * 2;

    // Create smooth curve path
    let pathD = "";
    let areaPathD = "";

    if (points.length === 1) {
      // Single point - draw a horizontal line with dot
      const x = points[0]?.x ?? CHART_PADDING;
      const y = points[0]?.y ?? CHART_HEIGHT / 2;
      pathD = `M ${CHART_PADDING} ${y} L ${CHART_WIDTH - CHART_PADDING} ${y}`;
      areaPathD = `M ${CHART_PADDING} ${y} L ${CHART_WIDTH - CHART_PADDING} ${y} L ${CHART_WIDTH - CHART_PADDING} ${CHART_HEIGHT - CHART_PADDING} L ${CHART_PADDING} ${CHART_HEIGHT - CHART_PADDING} Z`;
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
            areaPathD += ` L ${point.x} ${CHART_HEIGHT - CHART_PADDING} L ${firstPoint.x} ${CHART_HEIGHT - CHART_PADDING} Z`;
          }
        }
      });
    }

    // Y-axis grid lines and labels
    const gridLines = buildGridLines(maxValue, 5, innerHeight, false);

    return (
      <View className="mt-2">
        <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
          {/* Grid lines */}
          {renderGridLines(gridLines, (v) => formatValue(Math.round(v), metric))}

          {/* Area fill under the line */}
          {points.length > 1 && <Path d={areaPathD} fill={chartColor} fillOpacity={0.1} />}

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
              <Rect x={point.x - 3} y={point.y - 3} width={6} height={6} rx={3} fill="white" />
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
              {points.length > 2 &&
                (() => {
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
        <ChartLegend entries={[{ color: chartColor, label: METRIC_LABELS[metric] ?? "Value" }]} />
      </View>
    );
  };

  return (
    <ChartCard title={title} description={description} className={className}>
      {renderChart()}
    </ChartCard>
  );
}

export default WasteChart;
