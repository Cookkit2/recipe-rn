/**
 * Shared chart rendering primitives for WasteChart and NutritionChart.
 *
 * Provides common grid lines, empty state, legend dot style, and a
 * ChartCard wrapper so both chart components can reuse the same logic.
 */

import * as React from "react";
import { View, StyleSheet } from "react-native";
import { Line, Text as SvgText } from "react-native-svg";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { P } from "~/components/ui/typography";
import { cn } from "~/lib/utils";
import { Dimensions } from "react-native";

export const { width: SCREEN_WIDTH } = Dimensions.get("window");
export const CHART_WIDTH = SCREEN_WIDTH - 48;
export const CHART_HEIGHT = 200;
export const CHART_PADDING = 40;

// ─── Grid lines ──────────────────────────────────────────────────────

export interface GridLineEntry {
  y: number;
  value: number;
}

/**
 * Build an array of grid-line entries for a chart.
 */
export function buildGridLines(
  maxValue: number,
  numGridLines: number = 5,
  chartHeight: number = CHART_HEIGHT - CHART_PADDING * 2,
  roundValue: boolean = true
): GridLineEntry[] {
  const lines: GridLineEntry[] = [];
  for (let i = 0; i <= numGridLines; i++) {
    const y = CHART_PADDING + (chartHeight / numGridLines) * i;
    const value = roundValue
      ? Math.round(maxValue - (maxValue / numGridLines) * i)
      : maxValue - (maxValue / numGridLines) * i;
    lines.push({ y, value });
  }
  return lines;
}

/**
 * Render SVG grid lines with optional value labels.
 */
export function renderGridLines(
  gridLines: GridLineEntry[],
  formatValue: (v: number) => string = (v) => String(v)
): React.ReactNode {
  return gridLines.map((line, index) => (
    <React.Fragment key={`grid-${index}`}>
      <Line
        x1={CHART_PADDING}
        y1={line.y}
        x2={CHART_WIDTH - CHART_PADDING}
        y2={line.y}
        stroke="#e5e7eb"
        strokeWidth={1}
        strokeDasharray="4 4"
      />
      <SvgText x={CHART_PADDING - 5} y={line.y + 4} fontSize={10} fill="#9ca3af" textAnchor="end">
        {formatValue(line.value)}
      </SvgText>
    </React.Fragment>
  ));
}

// ─── Empty state ─────────────────────────────────────────────────────

export interface ChartEmptyStateProps {
  message: string;
}

export function ChartEmptyState({ message }: ChartEmptyStateProps) {
  return (
    <View className="items-center justify-center py-12">
      <P className="text-muted-foreground text-center">{message}</P>
    </View>
  );
}

// ─── Legend ──────────────────────────────────────────────────────────

export const legendDotStyles = StyleSheet.create({
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export interface LegendEntry {
  color: string;
  label: string;
}

export function ChartLegend({ entries }: { entries: LegendEntry[] }) {
  return (
    <View className="flex-row items-center justify-center mt-3 gap-4">
      {entries.map((entry) => (
        <View key={entry.label} className="flex-row items-center gap-1">
          <View style={[legendDotStyles.legendDot, { backgroundColor: entry.color }]} />
          <P className="text-xs text-muted-foreground">{entry.label}</P>
        </View>
      ))}
    </View>
  );
}

// ─── ChartCard wrapper ───────────────────────────────────────────────

export interface ChartCardProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({ title, description, className, children }: ChartCardProps) {
  return (
    <Card
      className={cn("mx-6 mt-6 rounded-3xl shadow-md shadow-foreground/10 border-none", className)}
    >
      <CardHeader className="pb-2">
        <CardTitle className="font-urbanist-bold">{title}</CardTitle>
        {description && (
          <P className="text-sm text-foreground/70 font-urbanist-medium mt-1">{description}</P>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
