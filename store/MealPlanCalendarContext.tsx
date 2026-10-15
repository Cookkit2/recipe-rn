import React, { createContext, useCallback, useContext, useState } from "react";
import type { CalendarDropTarget, MealPlanDragData, RecipeDragData } from "~/types/MealPlan";
import { startOfWeek } from "~/utils/meal-plan-calendar";

/**
 * Drag state for the meal planning calendar
 * Can be either dragging a recipe or moving an existing meal plan
 */
export type MealPlanDragState = {
  isDragging: boolean;
  data?: RecipeDragData | MealPlanDragData;
  target?: CalendarDropTarget;
};

interface MealPlanCalendarContextType {
  // Currently selected week (start date of the week)
  selectedWeek: Date;
  changeSelectedWeek: (date: Date) => void;
  selectedDate: Date;
  selectDate: (date: Date) => void;
  viewMode: "week" | "month";
  setViewMode: (mode: "week" | "month") => void;
  selectedSlot: CalendarDropTarget | null;
  selectSlot: (target: CalendarDropTarget) => void;

  // Drag and drop state for moving recipes/meal plans
  dragState: MealPlanDragState;
  updateDragState: (state: MealPlanDragState) => void;

  // Recipe selection sheet visibility
  isRecipeSheetOpen: boolean;
  updateRecipeSheetOpen: (value: boolean) => void;
}

const MealPlanCalendarContext = createContext<MealPlanCalendarContextType | null>(null);

export function MealPlanCalendarProvider({ children }: { children: React.ReactNode }) {
  const [selectedWeek, setSelectedWeek] = useState<Date>(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [selectedSlot, setSelectedSlot] = useState<CalendarDropTarget | null>(null);
  const [dragState, setDragState] = useState<MealPlanDragState>({ isDragging: false });
  const [isRecipeSheetOpen, setIsRecipeSheetOpen] = useState<boolean>(false);

  // UI callbacks
  const changeSelectedWeek = useCallback((date: Date) => {
    setSelectedWeek(startOfWeek(date));
    setSelectedDate(date);
    setSelectedSlot(null);
  }, []);

  const selectSlot = useCallback((target: CalendarDropTarget) => {
    setSelectedSlot(target);
    setSelectedDate(target.date);
    setSelectedWeek(startOfWeek(target.date));
  }, []);

  const updateDragState = useCallback((state: MealPlanDragState) => {
    setDragState(state);
  }, []);

  const updateRecipeSheetOpen = useCallback((value: boolean) => {
    setIsRecipeSheetOpen(value);
  }, []);

  return (
    <MealPlanCalendarContext.Provider
      value={{
        selectedWeek,
        changeSelectedWeek,
        selectedDate,
        selectDate: changeSelectedWeek,
        viewMode,
        setViewMode,
        selectedSlot,
        selectSlot,
        dragState,
        updateDragState,
        isRecipeSheetOpen,
        updateRecipeSheetOpen,
      }}
    >
      {children}
    </MealPlanCalendarContext.Provider>
  );
}

export const useMealPlanCalendar = () => {
  const context = useContext(MealPlanCalendarContext);
  if (!context) {
    throw new Error("useMealPlanCalendar must be used within a MealPlanCalendarProvider");
  }
  return context;
};
