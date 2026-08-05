import { renderHook, act } from "@testing-library/react-hooks";
import { useFirstRunAha, AHA_FEATURE_FLAG_KEY } from "../useFirstRunAha";
import { storage } from "~/data";
import { AHA_SCREEN_SEEN_KEY } from "~/constants/storage-keys";
import { useFeatureFlag } from "~/hooks/queries/useFeatureFlags";

jest.mock("~/data", () => ({
  storage: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock("~/hooks/queries/useFeatureFlags", () => ({
  useFeatureFlag: jest.fn(),
}));

describe("useFirstRunAha", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not show when feature flag is loading", () => {
    (useFeatureFlag as jest.Mock).mockReturnValue({ enabled: false, isLoading: true });
    (storage.get as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useFirstRunAha());

    expect(useFeatureFlag).toHaveBeenCalledWith(AHA_FEATURE_FLAG_KEY);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.shouldShow).toBe(false);
  });

  it("should not show when feature flag is disabled", () => {
    (useFeatureFlag as jest.Mock).mockReturnValue({ enabled: false, isLoading: false });
    (storage.get as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useFirstRunAha());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.shouldShow).toBe(false);
  });

  it("should show when feature flag is enabled and screen has not been seen", () => {
    (useFeatureFlag as jest.Mock).mockReturnValue({ enabled: true, isLoading: false });
    (storage.get as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useFirstRunAha());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.shouldShow).toBe(true);
  });

  it("should not show when feature flag is enabled but screen has already been seen", () => {
    (useFeatureFlag as jest.Mock).mockReturnValue({ enabled: true, isLoading: false });
    (storage.get as jest.Mock).mockReturnValue(true);

    const { result } = renderHook(() => useFirstRunAha());

    expect(storage.get).toHaveBeenCalledWith(AHA_SCREEN_SEEN_KEY);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.shouldShow).toBe(false);
  });

  it("should correctly mark the screen as seen", () => {
    (useFeatureFlag as jest.Mock).mockReturnValue({ enabled: true, isLoading: false });
    (storage.get as jest.Mock).mockReturnValue(false);

    const { result } = renderHook(() => useFirstRunAha());

    act(() => {
      result.current.markSeen();
    });

    expect(storage.set).toHaveBeenCalledWith(AHA_SCREEN_SEEN_KEY, true);
  });
});
