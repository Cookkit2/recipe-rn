import { renderHook, act } from "@testing-library/react-hooks";
import { useDebouncedValue } from "../useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("updates after delay when value changes", () => {
    const { result, rerender } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 300), {
      initialProps: { v: "" },
    });

    expect(result.current).toBe("");

    rerender({ v: "ab" });
    expect(result.current).toBe("");

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe("");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("ab");
  });

  it("resets timer on rapid changes", () => {
    const { result, rerender } = renderHook(({ v }: { v: string }) => useDebouncedValue(v, 200), {
      initialProps: { v: "a" },
    });

    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe("a");

    rerender({ v: "b" });
    expect(result.current).toBe("a");

    act(() => {
      jest.advanceTimersByTime(100);
    });
    rerender({ v: "c" });
    act(() => {
      jest.advanceTimersByTime(200);
    });
    expect(result.current).toBe("c");
  });
});
