import React from "react";
import { Text } from "react-native";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { MealPlanCalendarProvider, useMealPlanCalendar } from "~/store/MealPlanCalendarContext";
import type { CalendarMealPlan } from "~/types/MealPlan";
import MealSlot from "../MealSlot";

const mockGestures: Array<Record<string, any>> = [];
jest.mock("react-native-gesture-handler", () => {
  const makeGesture = (type: string) => {
    const handlers: Record<string, any> = { type };
    const gesture = new Proxy(handlers, {
      get: (target, key: string) => {
        if (key in target) return target[key];
        return (value: unknown) => {
          target[key] = value;
          return gesture;
        };
      },
    });
    mockGestures.push(handlers);
    return gesture;
  };
  return {
    Gesture: { Pan: () => makeGesture("pan"), LongPress: () => makeGesture("longPress") },
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
  };
});
jest.mock("~/hooks/useSelectionHaptic", () => ({ useSelectionHaptic: () => jest.fn() }));
jest.mock("~/utils/logger", () => ({ log: { warn: jest.fn(), error: jest.fn() } }));
jest.mock("../MealPlanEntryEditor", () => () => null);
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: "medium" },
}));
jest.mock("expo-image", () => ({ Image: () => null }));
jest.mock("~/components/ui/typography", () => ({
  P: (props: any) => React.createElement(Text, props),
}));

const meal: CalendarMealPlan = {
  id: "planned-pasta",
  recipeId: "pasta",
  recipe: { id: "pasta", title: "Pasta", imageUrl: "" },
  date: new Date(2026, 9, 24),
  mealSlot: "lunch",
  servings: 3,
  createdAt: new Date(2026, 9, 24),
  updatedAt: new Date(2026, 9, 24),
};

function DragStatus() {
  const { dragState } = useMealPlanCalendar();
  return <Text testID="drag-state">{JSON.stringify(dragState)}</Text>;
}

beforeEach(() => mockGestures.splice(0));

it("starts dragging the existing meal from its calendar card", async () => {
  await render(
    <MealPlanCalendarProvider>
      <MealSlot date={meal.date} mealSlot="lunch" mealPlans={[meal]} />
      <DragStatus />
    </MealPlanCalendarProvider>
  );

  const pan = mockGestures.find((gesture) => gesture.type === "pan");
  expect(pan).toBeDefined();
  expect(pan!.activateAfterLongPress).toBeGreaterThanOrEqual(200);
  await act(() => pan!.onStart({ absoluteX: 50, absoluteY: 100 }));
  await waitFor(() => {
    expect(JSON.parse(screen.getByTestId("drag-state").props.children)).toMatchObject({
      isDragging: true,
      data: { mealPlanId: meal.id, currentMealSlot: "lunch", servings: 3 },
    });
  });
});

let calendar: ReturnType<typeof useMealPlanCalendar>;
function CalendarProbe() {
  calendar = useMealPlanCalendar();
  return null;
}

async function renderCalendar() {
  await render(
    <MealPlanCalendarProvider>
      <MealSlot date={meal.date} mealSlot="lunch" mealPlans={[meal]} />
      <CalendarProbe />
    </MealPlanCalendarProvider>
  );
}

it("drops the existing meal onto the target under the release coordinates exactly once", async () => {
  await renderCalendar();
  const onDrop = jest.fn();
  const targetDate = new Date(2026, 9, 25);
  calendar.registerDropTarget("dinner", {
    date: targetDate,
    mealSlot: "dinner",
    measure: async () => ({ x: 200, y: 300, width: 120, height: 100 }),
    onDrop,
  });
  const pan = mockGestures.find((gesture) => gesture.type === "pan")!;
  await act(() => pan.onStart({ absoluteX: 50, absoluteY: 100 }));
  await act(() => pan.onUpdate({ absoluteX: 250, absoluteY: 350 }));
  expect(calendar.hoveredDropTarget).toBe("dinner");
  await act(() => pan.onEnd({ absoluteX: 250, absoluteY: 350 }));
  await waitFor(() => expect(onDrop).toHaveBeenCalledTimes(1));
  expect(onDrop).toHaveBeenCalledWith(targetDate, "dinner", {
    mealPlanId: meal.id,
    currentDate: meal.date,
    currentMealSlot: "lunch",
    servings: 3,
  });
  await act(() => pan.onEnd({ absoluteX: 250, absoluteY: 350 }));
  expect(onDrop).toHaveBeenCalledTimes(1);
  expect(calendar.dragState.isDragging).toBe(false);
});

it("keeps the meal slot when dropping onto a month date", async () => {
  await renderCalendar();
  const onDrop = jest.fn();
  const date = new Date(2026, 9, 27);
  calendar.registerDropTarget("month-date", {
    date,
    measure: async () => ({ x: 100, y: 100, width: 80, height: 80 }),
    onDrop,
  });
  await act(() => calendar.startMealDrag(meal, { x: 50, y: 50 }));
  await act(() => calendar.finishMealDrag({ x: 140, y: 140 }));
  expect(onDrop).toHaveBeenCalledWith(
    date,
    "lunch",
    expect.objectContaining({ mealPlanId: meal.id })
  );
});

it("remeasures the destination after layout changes and ignores its old position", async () => {
  await renderCalendar();
  const onDrop = jest.fn();
  const measure = jest.fn().mockResolvedValue({ x: 100, y: 100, width: 80, height: 80 });
  calendar.registerDropTarget("moved-target", {
    date: new Date(2026, 9, 27),
    mealSlot: "breakfast",
    measure,
    onDrop,
  });
  await act(() => calendar.startMealDrag(meal, { x: 50, y: 50 }));
  measure.mockResolvedValue({ x: 300, y: 300, width: 80, height: 80 });
  await act(() => calendar.finishMealDrag({ x: 140, y: 140 }));
  expect(onDrop).not.toHaveBeenCalled();
  expect(calendar.dragState.isDragging).toBe(false);
});

it("leaves the meal untouched for a cancelled drag or a drop onto its current slot", async () => {
  await renderCalendar();
  const onDrop = jest.fn();
  calendar.registerDropTarget("original-slot", {
    date: meal.date,
    mealSlot: "lunch",
    measure: async () => ({ x: 0, y: 0, width: 100, height: 100 }),
    onDrop,
  });
  await act(() => calendar.startMealDrag(meal, { x: 50, y: 50 }));
  await act(() => calendar.finishMealDrag({ x: 50, y: 50 }));
  expect(onDrop).not.toHaveBeenCalled();

  await act(() => calendar.startMealDrag(meal, { x: 50, y: 50 }));
  await act(() => calendar.cancelMealDrag());
  await act(() => calendar.finishMealDrag({ x: 50, y: 50 }));
  expect(onDrop).not.toHaveBeenCalled();
  expect(calendar.dragState.isDragging).toBe(false);
});

it("cancels a release that is still waiting for native measurements", async () => {
  await renderCalendar();
  const onDrop = jest.fn();
  let resolveMeasurement!: (bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  const measurement = new Promise<{ x: number; y: number; width: number; height: number }>(
    (resolve) => {
      resolveMeasurement = resolve;
    }
  );
  calendar.registerDropTarget("late-target", {
    date: new Date(2026, 9, 25),
    mealSlot: "dinner",
    measure: () => measurement,
    onDrop,
  });
  await act(() => calendar.startMealDrag(meal, { x: 50, y: 50 }));
  let release!: Promise<void>;
  await act(() => {
    release = calendar.finishMealDrag({ x: 50, y: 50 });
    calendar.cancelMealDrag();
  });
  await act(async () => {
    resolveMeasurement({ x: 0, y: 0, width: 100, height: 100 });
    await release;
  });
  expect(onDrop).not.toHaveBeenCalled();
  expect(calendar.dragState.isDragging).toBe(false);
});

it("ignores a scrolled-off slot behind the toolbar outside the calendar viewport", async () => {
  await renderCalendar();
  const onDrop = jest.fn();
  calendar.registerDropViewport(async () => ({ x: 0, y: 200, width: 400, height: 600 }));
  calendar.registerDropTarget("offscreen-slot", {
    date: new Date(2026, 9, 25),
    mealSlot: "dinner",
    measure: async () => ({ x: 0, y: 100, width: 100, height: 100 }),
    onDrop,
  });
  await act(() => calendar.startMealDrag(meal, { x: 50, y: 250 }));
  await act(() => calendar.finishMealDrag({ x: 50, y: 150 }));
  expect(onDrop).not.toHaveBeenCalled();
});
