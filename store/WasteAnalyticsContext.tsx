import React, { createContext, useCallback, useContext, useState } from "react";

// Time period filter for analytics
export type TimePeriod = "week" | "month" | "year" | "all";

// Waste reason filter
export type WasteReasonFilter = "all" | "expired" | "spoiled" | "excess" | "accidental" | "unknown";

// Metric type for charts
export type MetricType = "quantity" | "cost" | "count";

interface WasteAnalyticsContextType {
  // Time period filter
  selectedTimePeriod: TimePeriod;
  changeTimePeriod: (period: TimePeriod) => void;

  // Reason filter
  selectedReason: WasteReasonFilter;
  changeReason: (reason: WasteReasonFilter) => void;

  // Chart metric type
  selectedMetric: MetricType;
  changeMetric: (metric: MetricType) => void;

  // UI State
  isLogWasteDialogOpen: boolean;
  openLogWasteDialog: () => void;
  closeLogWasteDialog: () => void;

  // Achievement celebration
  showAchievementUnlock: boolean;
  setAchievementUnlockVisible: (visible: boolean) => void;
}

const WasteAnalyticsContext = createContext<WasteAnalyticsContextType | null>(null);

export function WasteAnalyticsProvider({ children }: { children: React.ReactNode }) {
  // UI State
  const [selectedTimePeriod, setSelectedTimePeriod] = useState<TimePeriod>("month");
  const [selectedReason, setSelectedReason] = useState<WasteReasonFilter>("all");
  const [selectedMetric, setSelectedMetric] = useState<MetricType>("quantity");
  const [isLogWasteDialogOpen, setIsLogWasteDialogOpen] = useState<boolean>(false);
  const [showAchievementUnlock, setShowAchievementUnlock] = useState<boolean>(false);

  // UI callbacks
  const changeTimePeriod = useCallback((period: TimePeriod) => {
    setSelectedTimePeriod(period);
  }, []);

  const changeReason = useCallback((reason: WasteReasonFilter) => {
    setSelectedReason(reason);
  }, []);

  const changeMetric = useCallback((metric: MetricType) => {
    setSelectedMetric(metric);
  }, []);

  const openLogWasteDialog = useCallback(() => {
    setIsLogWasteDialogOpen(true);
  }, []);

  const closeLogWasteDialog = useCallback(() => {
    setIsLogWasteDialogOpen(false);
  }, []);

  const setAchievementUnlockVisible = useCallback((visible: boolean) => {
    setShowAchievementUnlock(visible);
  }, []);

  return (
    <WasteAnalyticsContext.Provider
      value={{
        selectedTimePeriod,
        changeTimePeriod,
        selectedReason,
        changeReason,
        selectedMetric,
        changeMetric,
        isLogWasteDialogOpen,
        openLogWasteDialog,
        closeLogWasteDialog,
        showAchievementUnlock,
        setAchievementUnlockVisible,
      }}
    >
      {children}
    </WasteAnalyticsContext.Provider>
  );
}

export const useWasteAnalyticsStore = () => {
  const context = useContext(WasteAnalyticsContext);
  if (!context) {
    throw new Error("useWasteAnalyticsStore must be used within a WasteAnalyticsProvider");
  }
  return context;
};
