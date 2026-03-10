import React, { createContext, useCallback, useContext, useState } from "react";
import type {
  CalendarDropTarget,
  MealPlanDragData,
  RecipeDragData,
} from "~/types/MealPlan";

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

  // Drag and drop state for moving recipes/meal plans
  dragState: MealPlanDragState;
  updateDragState: (state: MealPlanDragState) => void;

  // Recipe selection sheet visibility
  isRecipeSheetOpen: boolean;
  updateRecipeSheetOpen: (value: boolean) => void;
}

const MealPlanCalendarContext = createContext<MealPlanCalendarContextType | null>(null);

export function MealPlanCalendarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize with current week (Sunday as start of week)
  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const [selectedWeek, setSelectedWeek] = useState<Date>(getWeekStart(new Date()));
  const [dragState, setDragState] = useState<MealPlanDragState>({ isDragging: false });
  const [isRecipeSheetOpen, setIsRecipeSheetOpen] = useState<boolean>(false);

  // UI callbacks
  const changeSelectedWeek = useCallback((date: Date) => {
    setSelectedWeek(getWeekStart(date));
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
    throw new Error(
      "useMealPlanCalendar must be used within a MealPlanCalendarProvider"
    );
  }
  return context;
};
