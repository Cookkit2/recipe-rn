import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import {
  WasteAnalyticsProvider,
  useWasteAnalyticsStore,
  TimePeriod,
  WasteReasonFilter,
  MetricType,
} from '../WasteAnalyticsContext';

describe('WasteAnalyticsContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WasteAnalyticsProvider>{children}</WasteAnalyticsProvider>
  );

  it('provides default values', () => {
    const { result } = renderHook(() => useWasteAnalyticsStore(), { wrapper });

    expect(result.current.selectedTimePeriod).toBe('month');
    expect(result.current.selectedReason).toBe('all');
    expect(result.current.selectedMetric).toBe('quantity');
    expect(result.current.isLogWasteDialogOpen).toBe(false);
    expect(result.current.showAchievementUnlock).toBe(false);
  });

  it('updates time period', () => {
    const { result } = renderHook(() => useWasteAnalyticsStore(), { wrapper });

    act(() => {
      result.current.changeTimePeriod('week');
    });
    expect(result.current.selectedTimePeriod).toBe('week');

    act(() => {
      result.current.changeTimePeriod('year');
    });
    expect(result.current.selectedTimePeriod).toBe('year');
  });

  it('updates reason filter', () => {
    const { result } = renderHook(() => useWasteAnalyticsStore(), { wrapper });

    act(() => {
      result.current.changeReason('expired');
    });
    expect(result.current.selectedReason).toBe('expired');
  });

  it('updates metric type', () => {
    const { result } = renderHook(() => useWasteAnalyticsStore(), { wrapper });

    act(() => {
      result.current.changeMetric('cost');
    });
    expect(result.current.selectedMetric).toBe('cost');
  });

  it('toggles log waste dialog', () => {
    const { result } = renderHook(() => useWasteAnalyticsStore(), { wrapper });

    act(() => {
      result.current.openLogWasteDialog();
    });
    expect(result.current.isLogWasteDialogOpen).toBe(true);

    act(() => {
      result.current.closeLogWasteDialog();
    });
    expect(result.current.isLogWasteDialogOpen).toBe(false);
  });

  it('toggles achievement unlock visibility', () => {
    const { result } = renderHook(() => useWasteAnalyticsStore(), { wrapper });

    act(() => {
      result.current.setAchievementUnlockVisible(true);
    });
    expect(result.current.showAchievementUnlock).toBe(true);

    act(() => {
      result.current.setAchievementUnlockVisible(false);
    });
    expect(result.current.showAchievementUnlock).toBe(false);
  });

  it('throws error when hook is used outside of provider', () => {
    // We expect console.error to be called because React logs errors on thrown exceptions during render
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useWasteAnalyticsStore());
    }).toThrow('useWasteAnalyticsStore must be used within a WasteAnalyticsProvider');

    console.error = originalError;
  });
});
