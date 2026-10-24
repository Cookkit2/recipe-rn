import { act, renderHook } from "@testing-library/react-native";
import { useMealDragAutoScroll } from "../useMealDragAutoScroll";

const mockContext = {
  dragState: { isDragging: false },
  dragPosition: { x: { value: 380 }, y: { value: 280 } },
  moveMealDrag: jest.fn(),
  registerDropViewport: jest.fn(() => jest.fn()),
};
jest.mock("~/store/MealPlanCalendarContext", () => ({ useMealPlanCalendar: () => mockContext }));

beforeEach(() => {
  jest.useFakeTimers();
  mockContext.dragState.isDragging = false;
  mockContext.dragPosition.x.value = 380;
  mockContext.dragPosition.y.value = 280;
});
afterEach(() => jest.useRealTimers());

it.each([true, false])(
  "scrolls toward an edge during a drag and stops at the content boundary (horizontal=%s)",
  async (horizontal) => {
    const scrollTo = jest.fn();
    const { result, rerender, unmount } = await renderHook(() => useMealDragAutoScroll(horizontal));
    result.current.ref.current = {
      measureInWindow: (callback: (...values: number[]) => void) => callback(0, 100, 400, 200),
      scrollTo,
    } as unknown as NonNullable<typeof result.current.ref.current>;
    result.current.onContentSizeChange(440, 240);
    mockContext.dragState.isDragging = true;
    await rerender(undefined);
    await act(() => jest.advanceTimersByTime(600));
    expect(scrollTo).toHaveBeenLastCalledWith({
      x: horizontal ? 40 : 0,
      y: horizontal ? 0 : 40,
      animated: false,
    });
    const callCount = scrollTo.mock.calls.length;
    mockContext.dragState.isDragging = false;
    await rerender(undefined);
    await act(() => jest.advanceTimersByTime(600));
    expect(scrollTo).toHaveBeenCalledTimes(callCount);
    await unmount();
  }
);

it("does not scroll when the pointer is outside the calendar viewport", async () => {
  const scrollTo = jest.fn();
  const { result, rerender } = await renderHook(() => useMealDragAutoScroll(true));
  result.current.ref.current = {
    measureInWindow: (callback: (...values: number[]) => void) => callback(0, 100, 400, 200),
    scrollTo,
  } as unknown as NonNullable<typeof result.current.ref.current>;
  result.current.onContentSizeChange(2000, 500);
  mockContext.dragPosition.y.value = 50;
  mockContext.dragState.isDragging = true;
  await rerender(undefined);
  await act(() => jest.advanceTimersByTime(600));
  expect(scrollTo).not.toHaveBeenCalled();
});
