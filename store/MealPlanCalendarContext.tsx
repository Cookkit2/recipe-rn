import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { useSharedValue, type SharedValue } from "react-native-reanimated";
import type {
  CalendarDropTarget,
  CalendarMealPlan,
  MealPlanDragData,
  MealSlot,
  RecipeDragData,
} from "~/types/MealPlan";
import { localDateKey, startOfWeek } from "~/utils/meal-plan-calendar";

export type MealDragPoint = { x: number; y: number };
export type MealDropBounds = MealDragPoint & { width: number; height: number };
export type MealDropHandler = (
  date: Date,
  mealSlot: MealSlot,
  data: MealPlanDragData
) => void | Promise<void>;
type MealDropZone = {
  date: Date;
  mealSlot?: MealSlot;
  measure: () => Promise<MealDropBounds | null>;
  onDrop: MealDropHandler;
};

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
  draggedMeal: CalendarMealPlan | null;
  dragPosition: { x: SharedValue<number>; y: SharedValue<number> };
  hoveredDropTarget: string | null;
  registerDropTarget: (id: string, zone: MealDropZone) => () => void;
  registerDropViewport: (measure: () => Promise<MealDropBounds | null>) => () => void;
  startMealDrag: (meal: CalendarMealPlan, point: MealDragPoint) => void;
  moveMealDrag: (point: MealDragPoint, remeasure?: boolean) => void;
  finishMealDrag: (point: MealDragPoint) => Promise<void>;
  cancelMealDrag: () => void;

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
  const [draggedMeal, setDraggedMeal] = useState<CalendarMealPlan | null>(null);
  const [hoveredDropTarget, setHoveredDropTarget] = useState<string | null>(null);
  const activeMeal = useRef<CalendarMealPlan | null>(null);
  const dragSession = useRef(0);
  const isFinishingDrag = useRef(false);
  const dropZones = useRef(new Map<string, MealDropZone>());
  const measuredZones = useRef(new Map<string, MealDropBounds>());
  const dropViewport = useRef<(() => Promise<MealDropBounds | null>) | null>(null);
  const measuredViewport = useRef<MealDropBounds | null>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const lastMeasurementTime = useRef(0);

  const registerDropTarget = useCallback((id: string, zone: MealDropZone) => {
    dropZones.current.set(id, zone);
    return () => {
      if (dropZones.current.get(id) === zone) {
        dropZones.current.delete(id);
        measuredZones.current.delete(id);
      }
    };
  }, []);

  const registerDropViewport = useCallback((measure: () => Promise<MealDropBounds | null>) => {
    dropViewport.current = measure;
    return () => {
      if (dropViewport.current === measure) {
        dropViewport.current = null;
        measuredViewport.current = null;
      }
    };
  }, []);

  const measureDropZones = useCallback(async () => {
    const [entries, viewport] = await Promise.all([
      Promise.all(
        [...dropZones.current].map(async ([id, zone]) => [id, await zone.measure()] as const)
      ),
      dropViewport.current?.() ?? Promise.resolve(null),
    ]);
    measuredViewport.current = viewport;
    measuredZones.current = new Map(
      entries.filter((entry): entry is readonly [string, MealDropBounds] => entry[1] !== null)
    );
  }, []);

  const findDropTarget = useCallback((point: MealDragPoint) => {
    const viewport = measuredViewport.current;
    if (
      dropViewport.current &&
      (!viewport ||
        point.x < viewport.x ||
        point.x > viewport.x + viewport.width ||
        point.y < viewport.y ||
        point.y > viewport.y + viewport.height)
    )
      return undefined;
    // Smaller targets (meal slots) take priority over enclosing date targets.
    return [...measuredZones.current]
      .filter(
        ([id, bounds]) =>
          dropZones.current.has(id) &&
          point.x >= bounds.x &&
          point.x <= bounds.x + bounds.width &&
          point.y >= bounds.y &&
          point.y <= bounds.y + bounds.height
      )
      .sort((a, b) => a[1].width * a[1].height - b[1].width * b[1].height)[0]?.[0];
  }, []);

  const cancelMealDrag = useCallback(() => {
    dragSession.current += 1;
    isFinishingDrag.current = false;
    activeMeal.current = null;
    setDraggedMeal(null);
    setHoveredDropTarget(null);
    setDragState({ isDragging: false });
  }, []);

  const startMealDrag = useCallback(
    (meal: CalendarMealPlan, point: MealDragPoint) => {
      if (activeMeal.current || isFinishingDrag.current) return;
      dragSession.current += 1;
      activeMeal.current = meal;
      dragX.value = point.x;
      dragY.value = point.y;
      setDraggedMeal(meal);
      setDragState({
        isDragging: true,
        data: {
          mealPlanId: meal.id,
          currentDate: meal.date,
          currentMealSlot: meal.mealSlot,
          servings: meal.servings,
        },
      });
      void measureDropZones();
    },
    [dragX, dragY, measureDropZones]
  );

  const moveMealDrag = useCallback(
    (point: MealDragPoint, remeasure = false) => {
      if (!activeMeal.current) return;
      dragX.value = point.x;
      dragY.value = point.y;
      setHoveredDropTarget(findDropTarget(point) ?? null);
      if (remeasure && Date.now() - lastMeasurementTime.current >= 80) {
        lastMeasurementTime.current = Date.now();
        const session = dragSession.current;
        void measureDropZones().then(() => {
          if (activeMeal.current && dragSession.current === session)
            setHoveredDropTarget(findDropTarget({ x: dragX.value, y: dragY.value }) ?? null);
        });
      }
    },
    [dragX, dragY, findDropTarget, measureDropZones]
  );

  const finishMealDrag = useCallback(
    async (point: MealDragPoint) => {
      const meal = activeMeal.current;
      if (!meal) return;
      const session = dragSession.current;
      // Claim this release once, then remeasure so scrolling/layout changes
      // cannot send a meal to an old screen position.
      activeMeal.current = null;
      isFinishingDrag.current = true;
      try {
        await measureDropZones();
        if (dragSession.current !== session) return;
        const id = findDropTarget(point);
        const zone = id ? dropZones.current.get(id) : undefined;
        if (!zone) return;
        const mealSlot = zone.mealSlot ?? meal.mealSlot;
        if (localDateKey(zone.date) === localDateKey(meal.date) && mealSlot === meal.mealSlot)
          return;
        await zone.onDrop(zone.date, mealSlot, {
          mealPlanId: meal.id,
          currentDate: meal.date,
          currentMealSlot: meal.mealSlot,
          servings: meal.servings,
        });
      } finally {
        if (dragSession.current === session) cancelMealDrag();
      }
    },
    [measureDropZones, findDropTarget, cancelMealDrag]
  );

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
        draggedMeal,
        dragPosition: { x: dragX, y: dragY },
        hoveredDropTarget,
        registerDropTarget,
        registerDropViewport,
        startMealDrag,
        moveMealDrag,
        finishMealDrag,
        cancelMealDrag,
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
