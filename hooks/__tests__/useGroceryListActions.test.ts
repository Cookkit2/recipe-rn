import { renderHook, act } from "@testing-library/react-hooks";
import { Alert } from "react-native";
import { toast } from "sonner-native";
import { useGroceryListActions } from "../useGroceryListActions";
import {
  useClearGroceryChecks,
  useClearMealPlan,
  useDeleteGroceryItem,
} from "~/hooks/queries/useMealPlanQueries";

// Mock react-native Alert
jest.mock("react-native", () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock sonner-native toast
jest.mock("sonner-native", () => ({
  toast: {
    success: jest.fn(),
  },
}));

// Mock query hooks
jest.mock("~/hooks/queries/useMealPlanQueries", () => ({
  useClearGroceryChecks: jest.fn(),
  useClearMealPlan: jest.fn(),
  useDeleteGroceryItem: jest.fn(),
}));

describe("useGroceryListActions", () => {
  const mockClearChecksMutate = jest.fn();
  const mockClearMealPlanMutate = jest.fn();
  const mockDeleteItemMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useClearGroceryChecks as jest.Mock).mockReturnValue({
      mutate: mockClearChecksMutate,
    });
    (useClearMealPlan as jest.Mock).mockReturnValue({
      mutate: mockClearMealPlanMutate,
    });
    (useDeleteGroceryItem as jest.Mock).mockReturnValue({
      mutate: mockDeleteItemMutate,
    });
  });

  describe("initial state", () => {
    it("should have correct initial values", () => {
      const { result } = renderHook(() => useGroceryListActions());

      expect(result.current.isSelectionMode).toBe(false);
      expect(result.current.selectedItemNames.size).toBe(0);
    });
  });

  describe("toggleSelectionMode", () => {
    it("should toggle selection mode and clear selections", () => {
      const { result } = renderHook(() => useGroceryListActions());

      // Turn on selection mode
      act(() => {
        result.current.toggleSelectionMode();
      });
      expect(result.current.isSelectionMode).toBe(true);

      // Add a selection
      act(() => {
        result.current.toggleItemSelection("Apple");
      });
      expect(result.current.selectedItemNames.has("Apple")).toBe(true);

      // Turn off selection mode
      act(() => {
        result.current.toggleSelectionMode();
      });
      expect(result.current.isSelectionMode).toBe(false);
      // Selections should be cleared when mode is toggled
      expect(result.current.selectedItemNames.size).toBe(0);
    });
  });

  describe("toggleItemSelection", () => {
    it("should add and remove items from selection", () => {
      const { result } = renderHook(() => useGroceryListActions());

      // Add item
      act(() => {
        result.current.toggleItemSelection("Apple");
      });
      expect(result.current.selectedItemNames.has("Apple")).toBe(true);
      expect(result.current.selectedItemNames.size).toBe(1);

      // Add another item
      act(() => {
        result.current.toggleItemSelection("Banana");
      });
      expect(result.current.selectedItemNames.has("Banana")).toBe(true);
      expect(result.current.selectedItemNames.size).toBe(2);

      // Remove first item
      act(() => {
        result.current.toggleItemSelection("Apple");
      });
      expect(result.current.selectedItemNames.has("Apple")).toBe(false);
      expect(result.current.selectedItemNames.has("Banana")).toBe(true);
      expect(result.current.selectedItemNames.size).toBe(1);
    });
  });

  describe("handleClearChecked", () => {
    it("should call clearChecks.mutate and show toast on success", () => {
      const { result } = renderHook(() => useGroceryListActions());

      act(() => {
        result.current.handleClearChecked();
      });

      expect(mockClearChecksMutate).toHaveBeenCalledTimes(1);

      // Simulate success callback
      const options = mockClearChecksMutate.mock.calls[0][1];
      expect(options).toHaveProperty("onSuccess");

      act(() => {
        options.onSuccess();
      });

      expect(toast.success).toHaveBeenCalledWith("Cleared all checked items");
    });
  });

  describe("handleClearAll", () => {
    it("should show alert and do nothing on cancel", () => {
      const { result } = renderHook(() => useGroceryListActions());

      act(() => {
        result.current.handleClearAll();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Clear All",
        "Are you sure you want to clear your entire meal plan?",
        expect.any(Array)
      );

      const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
      const cancelButton = alertButtons.find((b: any) => b.style === "cancel");

      expect(cancelButton).toBeDefined();
      expect(mockClearMealPlanMutate).not.toHaveBeenCalled();
    });

    it("should call clearMealPlan.mutate and show toast when confirmed", () => {
      const { result } = renderHook(() => useGroceryListActions());

      act(() => {
        result.current.handleClearAll();
      });

      const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
      const clearButton = alertButtons.find((b: any) => b.style === "destructive");

      expect(clearButton).toBeDefined();

      // Simulate confirming the alert
      act(() => {
        clearButton.onPress();
      });

      expect(mockClearMealPlanMutate).toHaveBeenCalledTimes(1);

      // Simulate success callback
      const options = mockClearMealPlanMutate.mock.calls[0][1];
      expect(options).toHaveProperty("onSuccess");

      act(() => {
        options.onSuccess();
      });

      expect(toast.success).toHaveBeenCalledWith("Cleared all planned recipes");
    });
  });

  describe("handleDeleteSelected", () => {
    it("should do nothing if no items are selected", async () => {
      const { result } = renderHook(() => useGroceryListActions());

      await act(async () => {
        await result.current.handleDeleteSelected();
      });

      expect(Alert.alert).not.toHaveBeenCalled();
      expect(mockDeleteItemMutate).not.toHaveBeenCalled();
    });

    it("should show alert and do nothing on cancel", async () => {
      const { result } = renderHook(() => useGroceryListActions());

      act(() => {
        result.current.toggleItemSelection("Apple");
      });

      await act(async () => {
        await result.current.handleDeleteSelected();
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        "Delete Selected",
        "Are you sure you want to delete 1 items?",
        expect.any(Array)
      );

      const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
      const cancelButton = alertButtons.find((b: any) => b.style === "cancel");

      expect(cancelButton).toBeDefined();
      expect(mockDeleteItemMutate).not.toHaveBeenCalled();
    });

    it("should call deleteItem.mutate for each item, clear state, and show toast when confirmed", async () => {
      const { result } = renderHook(() => useGroceryListActions());

      act(() => {
        result.current.toggleSelectionMode(); // turn on mode
      });
      act(() => {
        result.current.toggleItemSelection("Apple");
      });
      act(() => {
        result.current.toggleItemSelection("Banana");
      });

      expect(result.current.isSelectionMode).toBe(true);
      expect(result.current.selectedItemNames.size).toBe(2);

      await act(async () => {
        await result.current.handleDeleteSelected();
      });

      const alertButtons = (Alert.alert as jest.Mock).mock.calls[0][2];
      const deleteButton = alertButtons.find((b: any) => b.style === "destructive");

      expect(deleteButton).toBeDefined();

      // Simulate confirming the alert
      await act(async () => {
        await deleteButton.onPress();
      });

      expect(mockDeleteItemMutate).toHaveBeenCalledTimes(2);
      expect(mockDeleteItemMutate).toHaveBeenCalledWith("Apple");
      expect(mockDeleteItemMutate).toHaveBeenCalledWith("Banana");

      expect(result.current.isSelectionMode).toBe(false);
      expect(result.current.selectedItemNames.size).toBe(0);
      expect(toast.success).toHaveBeenCalledWith("Deleted selected items");
    });
  });
});
